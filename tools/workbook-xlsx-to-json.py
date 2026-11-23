#!/usr/bin/env python3
"""Turns an .xlsx download of the master workbook into the private export the publish tools read.

    python3 -I tools/workbook-xlsx-to-json.py <book.xlsx> <export.json> [--compare <previous export.json>]

The export maps each tab to its rows (header first, trailing empty cells and rows dropped), with the values as the
sheet displays them, like the backend import (Sheets API, FORMATTED_VALUE). Both files stay outside Git.

The Google Drive download keeps the values but not every display format, so the formats that reach public values
are applied here: '#,##0.00' (Humanoids Valuation, live market caps) and 'm-d' (a Humanoids cell typed as 4-5).
Stocks' live columns (price, change_pct, market_cap, last_trade) are withheld by the import, so their formatting
does not matter. Any other non-General number format is listed so you can check it against the sheet.

--compare prints, per tab, the rows that differ from a previous export: expect only your new or changed rows and
the live Valuation cells. Requires openpyxl (pip install openpyxl).
"""
import collections
import datetime
import json
import sys

import openpyxl

KNOWN = {'General', '#,##0.00', 'm-d', 'M/d/yyyy H:mm:ss'}
LIVE_STOCK_COLUMNS = {'PRICE', 'CHANGE_PCT', 'MARKET_CAP', 'LAST_TRADE', 'DATA_DELAY_MIN', 'QUOTE_STATUS'}
# The listed-companies tab: 'Investment' since 23 Nov 2026 (renamed from 'Stocks', same sheet and columns).
STOCK_TABS = {'Investment', 'Stocks'}


def display(value, fmt):
    if value is None:
        return ''
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, datetime.datetime):
        if fmt == 'm-d':
            return f'{value.month}-{value.day}'
        if fmt == 'M/d/yyyy H:mm:ss':
            return f'{value.month}/{value.day}/{value.year} {value.hour}:{value.minute:02d}:{value.second:02d}'
        return value.strftime('%Y-%m-%d')
    if isinstance(value, datetime.date):
        return value.strftime('%Y-%m-%d')
    if isinstance(value, (int, float)):
        if fmt == '#,##0.00':
            return f'{value:,.2f}'
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value)
    return str(value)


def convert(path):
    book = openpyxl.load_workbook(path, data_only=True)
    out, other_formats = {}, collections.Counter()
    for sheet in book.worksheets:
        rows = []
        for row in sheet.iter_rows():
            values = []
            header = rows[0] if rows else []
            for j, cell in enumerate(row):
                live = sheet.title in STOCK_TABS and j < len(header) and header[j] in LIVE_STOCK_COLUMNS
                if cell.value is not None and not isinstance(cell.value, str) and cell.number_format not in KNOWN and not live:
                    other_formats[(sheet.title, cell.number_format)] += 1
                values.append(display(cell.value, cell.number_format))
            while values and values[-1] == '':
                values.pop()
            rows.append(values)
        while rows and not rows[-1]:
            rows.pop()
        out[sheet.title] = rows
    return out, other_formats


def compare(new, old):
    for tab in new:
        a, b = old.get(tab, []), new[tab]
        header = b[0] if b else []
        for i in range(max(len(a), len(b))):
            ra = a[i] if i < len(a) else None
            rb = b[i] if i < len(b) else None
            if ra == rb:
                continue
            if ra is None or rb is None:
                print(f'{tab}: sheet row {i + 1} {"added" if ra is None else "removed"}')
                continue
            cols = [header[j] if j < len(header) else str(j) for j in range(max(len(ra), len(rb)))
                    if (ra[j] if j < len(ra) else '') != (rb[j] if j < len(rb) else '')]
            if tab in STOCK_TABS and set(cols) <= LIVE_STOCK_COLUMNS:
                continue
            print(f'{tab}: sheet row {i + 1} changed in {", ".join(cols)}')


if __name__ == '__main__':
    args = sys.argv[1:]
    if len(args) < 2:
        sys.exit(__doc__)
    export, formats = convert(args[0])
    with open(args[1], 'w', encoding='utf-8') as f:
        json.dump(export, f, ensure_ascii=False)
    print('rows per tab (without header): ' + ', '.join(f'{t} {max(len(r) - 1, 0)}' for t, r in export.items()))
    for (tab, fmt), n in sorted(formats.items()):
        print(f'check by hand: {n} cells in {tab} with display format {fmt!r}, written as the plain number '
              '(on 17 Nov 2026 these matched the sheet display)')
    if '--compare' in args:
        with open(args[args.index('--compare') + 1], encoding='utf-8') as f:
            compare(export, json.load(f))
