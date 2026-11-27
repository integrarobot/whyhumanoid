/* Components explorer core (23 Nov 2026). One classic script shared by the page builder (tools/build-pages.mjs runs
   it in Node) and the browser (assets/components.js), so the static pages and the subscriber view classify and render
   a product the same way.

   Rules (see server/src/components/catalogue.js):
   - Classes come from explicit rules over the recorded text. When no rule matches, the value is "not classified";
     nothing is guessed. Each facet says what it is: a mention in a field, not a measured capability.
   - "Not available", "N/A" and empty are three different states and are never shown as zero or as a dash that could
     be read as zero. Values with model or configuration scope are flagged as varying.
   - Prices, quotes, third-party figures and BOM estimates stay separate, in their currency, never converted, never
     used to sort. Nothing is ranked: no score, no "best" by pixels, rate or price.
   - Product copy is the research compilation's, attributed as such; its review state is shown with every passport. */
(function (root) {
  'use strict';

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var linkify = function (s) {
    return esc(s).replace(/https?:\/\/[^\s<;]+/g, function (u) {
      var tail = '';
      while (/[.,)\]]$/.test(u) && !(u.slice(-1) === ')' && u.indexOf('(') >= 0)) { tail = u.slice(-1) + tail; u = u.slice(0, -1); }
      return '<a href="' + u + '" rel="noopener noreferrer">' + u.replace(/^https?:\/\/(www\.)?/, '') + '</a>' + tail;
    });
  };

  var GROUPS = {
    'Commercial': { key: 'commercial', label: 'Commercial product' },
    'Commercial (early access)': { key: 'early_access', label: 'Early access, not on open sale' },
    'Commercial (discontinued)': { key: 'discontinued', label: 'Discontinued' },
    'Research / open hardware': { key: 'research', label: 'Research or open hardware' },
    'Software (simulator)': { key: 'software', label: 'Related software' }
  };
  var CLASS_ORDER = ['commercial', 'early_access', 'research', 'discontinued', 'software', 'unclassified'];
  var CLASS_LABEL = { commercial: 'Commercial product', early_access: 'Early access, not on open sale', research: 'Research or open hardware', discontinued: 'Discontinued', software: 'Related software', unclassified: 'Not classified' };
  var classOf = function (group) { return (GROUPS[group] || { key: 'unclassified' }).key; };

  // Component families (26 Nov 2026): the COMPONENT_CLASS of each product, the same vocabulary as
  // server/src/components/catalogue.js (a test keeps them equal). Records written before the column existed fall back
  // only on their exact family label; nothing else is guessed.
  var COMMON_METRICS = ['mass', 'dimensions', 'operating_voltage', 'rated_power', 'peak_power', 'communication_interface', 'ip_rating', 'operating_temperature', 'update_rate'];
  var FAMILIES = {
    tactile_sensor: { label: 'Tactile sensor', plural: 'Tactile sensors', tactile: true, metrics: [] },
    tactile_hand: { label: 'Tactile robotic hand', plural: 'Tactile robotic hands', tactile: true, metrics: [] },
    actuator: { label: 'Actuator', plural: 'Actuators', metrics: ['rated_torque', 'peak_torque', 'rated_speed', 'max_speed', 'gear_ratio', 'backlash', 'torque_density', 'encoder_resolution', 'continuous_current', 'peak_current', 'backdrivability'] },
    reducer: { label: 'Reducer', plural: 'Reducers', metrics: ['gear_ratio', 'rated_torque', 'peak_torque', 'momentary_torque', 'backlash', 'torsional_stiffness', 'efficiency', 'max_input_speed', 'rated_life'] },
    motor_drive: { label: 'Motor or drive', plural: 'Motors and drives', metrics: ['rated_torque', 'peak_torque', 'rated_speed', 'continuous_current', 'peak_current', 'torque_constant', 'speed_constant', 'control_modes'] },
    dexterous_hand: { label: 'Dexterous hand', plural: 'Dexterous hands', metrics: ['degrees_of_freedom', 'actuated_dof', 'fingertip_force', 'grip_force', 'payload', 'closing_time', 'tactile_sensing'] },
    gripper: { label: 'Gripper', plural: 'Grippers', metrics: ['stroke', 'grip_force', 'payload', 'closing_time', 'repeatability'] },
    force_torque_sensor: { label: 'Force-torque sensor', plural: 'Force-torque sensors', metrics: ['force_range_xy', 'force_range_z', 'torque_range_xy', 'torque_range_z', 'force_resolution', 'torque_resolution', 'overload_capacity', 'sample_rate'] },
    vision_sensor: { label: 'Vision or depth sensor', plural: 'Vision and depth sensors', metrics: ['depth_range', 'depth_resolution', 'rgb_resolution', 'frame_rate', 'field_of_view', 'baseline', 'depth_accuracy', 'shutter'] },
    compute_module: { label: 'Compute module', plural: 'Compute modules', metrics: ['ai_performance', 'cpu', 'gpu', 'memory', 'power_range'] },
    motion_controller: { label: 'Motion controller', plural: 'Motion controllers', metrics: ['control_loop_rate', 'axes'] },
    power_battery: { label: 'Battery, cell or power part', plural: 'Batteries, cells and power parts', metrics: ['capacity', 'nominal_voltage', 'chemistry', 'max_discharge_current', 'cycle_life'],
      note: 'A cell or a battery-management chip is a part, not a ready robot battery pack: pack capacity, safety and certification depend on the pack design.' },
    encoder: { label: 'Encoder', plural: 'Encoders', metrics: ['resolution', 'accuracy', 'max_speed'] },
    bearing: { label: 'Bearing', plural: 'Bearings', metrics: ['inner_diameter', 'outer_diameter', 'width', 'dynamic_load_rating', 'static_load_rating'] }
  };
  var FAMILY_ORDER = ['tactile_sensor', 'tactile_hand', 'dexterous_hand', 'gripper', 'actuator', 'motor_drive', 'reducer', 'bearing', 'encoder', 'force_torque_sensor', 'vision_sensor', 'compute_module', 'motion_controller', 'power_battery'];
  var LEGACY_FAMILY = { 'Tactile sensor': 'tactile_sensor', 'Tactile robotic hand': 'tactile_hand' };
  var familyOf = function (r) {
    if (r && r.component_class && FAMILIES[r.component_class]) return r.component_class;
    return (r && LEGACY_FAMILY[r.family]) || 'unclassified';
  };
  var familyLabel = function (k) { return FAMILIES[k] ? FAMILIES[k].label : 'Family not classified'; };
  var isTactile = function (r) { var f = familyOf(r); return Boolean(FAMILIES[f] && FAMILIES[f].tactile); };
  var METRIC_LABEL = {
    mass: 'Mass', dimensions: 'Dimensions', operating_voltage: 'Operating voltage', rated_power: 'Rated power', peak_power: 'Peak power',
    communication_interface: 'Communication interface', ip_rating: 'Ingress protection', operating_temperature: 'Operating temperature', update_rate: 'Update rate',
    rated_torque: 'Rated torque', peak_torque: 'Peak torque', rated_speed: 'Rated speed', max_speed: 'Maximum speed', gear_ratio: 'Gear ratio', backlash: 'Backlash',
    torque_density: 'Torque density', encoder_resolution: 'Encoder resolution', continuous_current: 'Continuous current', peak_current: 'Peak current', backdrivability: 'Backdrivability',
    momentary_torque: 'Momentary torque', torsional_stiffness: 'Torsional stiffness', efficiency: 'Efficiency', max_input_speed: 'Maximum input speed', rated_life: 'Rated life',
    torque_constant: 'Torque constant', speed_constant: 'Speed constant', control_modes: 'Control modes',
    degrees_of_freedom: 'Degrees of freedom', actuated_dof: 'Actuated degrees of freedom', fingertip_force: 'Fingertip force', grip_force: 'Grip force', payload: 'Payload',
    closing_time: 'Closing time', tactile_sensing: 'Tactile sensing', stroke: 'Stroke', repeatability: 'Repeatability',
    force_range_xy: 'Force range (x, y)', force_range_z: 'Force range (z)', torque_range_xy: 'Torque range (x, y)', torque_range_z: 'Torque range (z)',
    force_resolution: 'Force resolution', torque_resolution: 'Torque resolution', overload_capacity: 'Overload capacity', sample_rate: 'Sample rate',
    depth_range: 'Depth range', depth_resolution: 'Depth resolution', rgb_resolution: 'Colour resolution', frame_rate: 'Frame rate', field_of_view: 'Field of view',
    baseline: 'Stereo baseline', depth_accuracy: 'Depth accuracy', shutter: 'Shutter',
    ai_performance: 'AI performance', cpu: 'CPU', gpu: 'GPU', memory: 'Memory', power_range: 'Power range', control_loop_rate: 'Control loop rate', axes: 'Axes',
    capacity: 'Capacity', nominal_voltage: 'Nominal voltage', chemistry: 'Chemistry', max_discharge_current: 'Maximum discharge current', cycle_life: 'Cycle life',
    resolution: 'Resolution', accuracy: 'Accuracy',
    inner_diameter: 'Inner diameter', outer_diameter: 'Outer diameter', width: 'Width', dynamic_load_rating: 'Basic dynamic load rating', static_load_rating: 'Basic static load rating'
  };
  var metricLabel = function (k) { return METRIC_LABEL[k] || String(k).replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); };
  // TECHNICAL_SPECIFICATIONS: "metric | value | unit | conditions | source_url | locator | checked_at", one per line.
  var parseSpecs = function (text) {
    return String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var p = l.split('|').map(function (x) { return x.trim(); });
      return p.length === 7 ? { metric: p[0], value: p[1], unit: p[2] || null, conditions: p[3] || null, source_url: p[4], locator: p[5] || null, checked_at: p[6] } : null;
    }).filter(Boolean);
  };
  var EVIDENCE_LABEL = {
    manufacturer_datasheet: 'Manufacturer datasheet', manufacturer_webpage: 'Manufacturer web page', manufacturer_manual: 'Manufacturer manual',
    peer_reviewed_paper: 'Peer-reviewed paper', preprint: 'Preprint', independent_test: 'Independent test', distributor_listing: 'Distributor listing'
  };
  var scopesOf = function (r) { return String((r && r.evidence_scope) || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean); };
  // What a checked record is, and what it is not: a declaration checked against its document is not a measurement.
  var scopeHtml = function (r) {
    var sc = scopesOf(r);
    if (!sc.length) return '';
    var tested = sc.indexOf('independent_test') >= 0;
    return '<p class="pp-scope"><b>Evidence:</b> ' + sc.map(function (k) { return '<span class="st">' + esc(EVIDENCE_LABEL[k] || k) + '</span>'; }).join('')
      + (r.checked_at ? ' <span class="dim">checked ' + esc(r.checked_at) + '</span>' : '')
      + (tested ? '' : '<br><small>Figures are the maker\'s or the paper\'s own statements, checked against that document. They are not independent performance tests.</small>') + '</p>';
  };

  // Sensing approach: first matching rule wins; the order puts explicit statements before generic words.
  var PRINCIPLES = [
    { key: 'not_stated', label: 'Principle not stated by the maker', re: /does not detail the physical principle|principle (is )?not stated/i,
      gives: 'The maker publishes what the sensor reports, not how it senses.', limits: 'Any statement about the physics is an inference and is marked as such in the record.' },
    { key: 'simulation', label: 'Simulation (software)', re: /^rendering|simulat/i,
      gives: 'Synthetic tactile images and depth maps for learning and testing without hardware.', limits: 'A simulator is not a sensor: the gap to real contact remains, and forces are not calibrated.' },
    { key: 'multimodal', label: 'Multimodal fingertip', re: /^multimodal/i,
      gives: 'Several channels in one part, such as contact images, pressure, vibration, temperature or motion.', limits: 'Each channel has its own rate and conditions; availability and integration effort can differ from single-channel parts.' },
    { key: 'optical_camera', label: 'Optical, camera-based', re: /camera|vision/i,
      gives: 'An image of the contact: geometry, texture and, with markers, shear and slip.', limits: 'Pixels are image resolution, not calibrated taxels; force is usually estimated by a model unless the part is calibrated; frame rate is set by the camera; optics take volume and gels wear.' },
    { key: 'optical_photodiode', label: 'Optical, photodiode-based', re: /photodiode/i,
      gives: 'Displacement and force per element from light inside soft elements.', limits: 'Few, larger elements; resolution is set by the element pitch.' },
    { key: 'magnetic', label: 'Magnetic or Hall effect', re: /magnet|hall effect/i,
      gives: 'Changes of a magnetic field under a soft layer: thin parts and fast signals.', limits: 'Few channels; external magnetic fields and temperature interfere; force comes from calibration or learned models.' },
    { key: 'capacitive', label: 'Capacitive', re: /capacitive/i,
      gives: 'Pressure distribution over an array of elements.', limits: 'Spatial resolution is set by element size; shear per element is not always reported.' },
    { key: 'fluid', label: 'Fluid and impedance (biomimetic)', re: /conductive fluid|impedance/i,
      gives: 'A finger-like part combining force, vibration and temperature.', limits: 'Complex to build and maintain; in this catalogue the only record is discontinued.' }
  ];
  var principleOf = function (text) {
    for (var i = 0; i < PRINCIPLES.length; i += 1) if (PRINCIPLES[i].re.test(String(text || ''))) return PRINCIPLES[i].key;
    return 'unclassified';
  };
  var principleLabel = function (key) {
    for (var i = 0; i < PRINCIPLES.length; i += 1) if (PRINCIPLES[i].key === key) return PRINCIPLES[i].label;
    return 'Not classified';
  };

  // Words in "Measured quantities". A mention, not a calibrated capability: the record says how each is obtained.
  var QUANTITIES = [
    { key: 'geometry', label: 'Contact geometry or shape', re: /geometr|topograph|shape|deformation|depth/i },
    { key: 'force', label: 'Force', re: /force/i },
    { key: 'shear', label: 'Shear or tangential force', re: /shear|tangential|x\/y/i },
    { key: 'torque', label: 'Torque', re: /torque/i },
    { key: 'slip', label: 'Slip', re: /slip/i },
    { key: 'vibration', label: 'Vibration', re: /vibration/i },
    { key: 'temperature', label: 'Temperature or heat', re: /temperature|heat/i },
    { key: 'texture', label: 'Texture', re: /texture/i },
    { key: 'location', label: 'Contact location', re: /location|contact point|position/i },
    { key: 'proximity', label: 'Proximity vision', re: /proximity|nearby object/i }
  ];
  var quantitiesOf = function (text) { return QUANTITIES.filter(function (q) { return q.re.test(String(text || '')); }).map(function (q) { return q.key; }); };

  var INTERFACES = [
    { key: 'usb', label: 'USB', re: /\bUSB/i }, { key: 'can', label: 'CAN', re: /\bCAN\b/ }, { key: 'i2c', label: 'I2C', re: /\bI2C\b/i },
    { key: 'spi', label: 'SPI', re: /\bSPI\b/i }, { key: 'serial', label: 'Serial', re: /\bserial\b/i }, { key: 'bluetooth', label: 'Bluetooth', re: /bluetooth/i },
    { key: 'library', label: 'Software library', re: /python library|pip install/i }
  ];
  // A parenthesis about an earlier generation ("(GEN3: USB converter)") never describes this product.
  var currentOnly = function (text) { return String(text || '').replace(/\(GEN\d[^)]*\)/gi, ''); };
  var interfacesOf = function (text) { var t = currentOnly(text); return INTERFACES.filter(function (q) { return q.re.test(t); }).map(function (q) { return q.key; }); };

  // ROS: mentioned for this product, only through community drivers of an earlier generation, or not mentioned.
  var rosOf = function (text) {
    var s = String(text || '');
    if (/community drivers for GEN\d/i.test(s)) return 'earlier_generation';
    return /\bROS\b|ROS ?2|ROS2/.test(s) ? 'mentioned' : 'not_mentioned';
  };
  var ROS_LABEL = { mentioned: 'ROS mentioned for this product', earlier_generation: 'ROS only via community drivers for an earlier generation', not_mentioned: 'No ROS mention' };

  var licenceOf = function (text) {
    var s = String(text || '');
    if (!s.trim() || /^not available|no spdx|license not available/i.test(s) || /code license not available/i.test(s)) return 'not_stated';
    if (/proprietary|eula/i.test(s)) return 'proprietary';
    if (/\bMIT\b|GPL|CC BY|Apache|BSD/i.test(s)) return 'published';
    return 'not_stated';
  };
  var LICENCE_LABEL = { published: 'Published licence (read its scope)', proprietary: 'Proprietary', not_stated: 'Licence not stated' };

  // Price: what kind of figure the record holds. Never parsed into a number, never compared or sorted.
  var priceOf = function (text) {
    var s = String(text || '').trim();
    var flags = [];
    if (!s) return { state: 'not_recorded', flags: flags };
    if (/^N\/A\b|not sold/i.test(s)) return { state: 'not_sold', flags: flags };
    if (/^free\b/i.test(s)) return { state: 'free', flags: flags };
    if (/third[- ]part|not verified|wowrobo/i.test(s)) flags.push('third_party');
    if (/distributor/i.test(s)) flags.push('distributor');
    if (/historical/i.test(s)) flags.push('historical');
    if (/^no (public|official) price/i.test(s)) return { state: 'no_public_price', flags: flags };
    if (/^on (request|enquiry)/i.test(s)) return { state: 'quote', flags: flags };
    if (/\d[\d,.]*\s*(USD|EUR|CNY|AUD|JPY|GBP)\b/.test(s)) return { state: 'listed', flags: flags };
    return { state: 'other', flags: flags };
  };
  var PRICE_LABEL = { listed: 'Price stated', quote: 'Quote on request', no_public_price: 'No public price', not_sold: 'Not sold', free: 'Free', not_recorded: 'Not recorded', other: 'See the record' };
  var PRICE_FLAG = { third_party: 'Third-party or unverified figure', distributor: 'Distributor figure', historical: 'Historical reference' };

  // A field value's state: a value, not available in the source, not applicable, or not recorded at all.
  var stateOf = function (v) {
    var s = v == null ? '' : String(v).trim();
    if (!s || s === 'undefined') return 'not_recorded';
    if (/^N\/A\b/.test(s)) return 'not_applicable';
    if (/^not available\b/i.test(s)) return 'not_available';
    return 'value';
  };
  var STATE_LABEL = { not_recorded: 'Not recorded', not_applicable: 'Not applicable', not_available: 'Not available in the source' };
  var varies = function (v) {
    var s = String(v || '');
    var prefixes = s.match(/(^|;\s*)[A-Za-z][A-Za-z0-9 .-]{1,24}:\s/g) || [];
    return prefixes.length >= 2 || /depending on model|variants?\b|other models|depends on the mode|kits?:/i.test(s);
  };
  var evidenceTags = function (v) {
    var s = String(v || ''), t = [];
    if (/\(manufacturer\)|according to the manufacturer|manufacturer only/i.test(s)) t.push('Maker-stated');
    if (/third[- ]part|not verified|cited by a search engine/i.test(s)) t.push('Unverified third-party figure');
    if (/\(paper\)|in the experiments|in the paper|according to the paper/i.test(s)) t.push('Paper conditions');
    if (/estimate|≈|approx/i.test(s)) t.push('Estimate or approximate');
    return t;
  };

  // Passport sections: every meaningful source field, grouped by meaning. SECTIONS is the touch-sensing passport;
  // sectionsFor(r) adds what the part does and its structured specifications, and gives other families their own.
  var SECTIONS = [
    { key: 'identity', title: 'Identity and status', fields: [['component_id', 'Component ID'], ['family', 'Family'], ['group', 'Group as recorded'], ['manufacturer', 'Manufacturer or laboratory'], ['country', 'Country'], ['year', 'Launch or publication'], ['status', 'Current status']] },
    { key: 'sensing', title: 'What it senses', fields: [['principle', 'Sensing principle'], ['measured', 'Measured quantities'], ['resolution_count', 'Taxels or camera resolution'], ['spatial_resolution', 'Spatial resolution'], ['force_range', 'Force range'], ['force_resolution', 'Force resolution'], ['sampling_rate', 'Sampling rate or frame rate']] },
    { key: 'physical', title: 'Form and durability', fields: [['dimensions', 'Dimensions'], ['weight', 'Weight'], ['surface', 'Sensing surface or shape'], ['durability', 'Durability and replaceable skin']] },
    { key: 'integration', title: 'Interfaces and software', fields: [['interface', 'Interface and connectivity'], ['software', 'Software, SDK and ROS'], ['integrations', 'Known users and integrations']] },
    { key: 'availability', title: 'Availability, price and licence', fields: [['where_to_buy', 'Where to get it'], ['list_price', 'List price (currency, date, source)'], ['bom_cost', 'Estimated BOM (open hardware)'], ['licence', 'Licence']] },
    { key: 'research', title: 'Research and design', fields: [['key_paper', 'Key paper'], ['repository', 'Repository or design files']] },
    { key: 'assessment', title: 'Advantages and drawbacks', fields: [['advantages', 'Advantages'], ['drawbacks', 'Drawbacks']], note: 'As summarised in the research compilation, not an independent assessment.' },
    { key: 'caveats', title: 'Notes and uncertainties', fields: [['notes', 'Notes and uncertainties']] }
  ];
  var FUNCTION_SECTION = { key: 'function', title: 'What it does', fields: [['function', 'Function'], ['applications', 'Applications, as stated by the source']] };
  var SPECS_SECTION = { key: 'specs', title: 'Technical specifications', specs: true, fields: [], note: 'One line per figure, with its unit, conditions, source and the date it was checked. Values are as the source states them: nothing is converted, estimated or rounded.' };
  // Comparison notes: the record's own labelled lines (scope, limitations), shown as recorded.
  var COMPARISON_SECTION = { key: 'comparison', title: 'Comparison notes', comparison: true, fields: [], note: 'The research record\'s own notes on what can and cannot be compared for this product.' };
  var GENERAL_SECTIONS = [
    { key: 'identity', title: 'Identity and status', fields: [['component_id', 'Component ID'], ['family', 'Family'], ['group', 'Group as recorded'], ['manufacturer', 'Manufacturer or laboratory'], ['country', 'Country'], ['year', 'Launch or publication'], ['status', 'Current status']] },
    { key: 'function', title: 'What it does', fields: [['function', 'Function'], ['principle', 'Technology or operating principle'], ['measured', 'What it measures, delivers or controls'], ['sampling_rate', 'Rate as recorded'], ['applications', 'Applications, as stated by the source']] },
    SPECS_SECTION,
    { key: 'physical', title: 'Form', fields: [['dimensions', 'Dimensions'], ['weight', 'Weight']] },
    { key: 'integration', title: 'Integration', fields: [['interface', 'Interface and connectivity'], ['software', 'Software, SDK and ROS'], ['integration_requirements', 'Integration requirements'], ['integrations', 'Known users and integrations']] },
    { key: 'availability', title: 'Availability, price and licence', fields: [['where_to_buy', 'Where to get it'], ['list_price', 'List price (currency, date, source)'], ['bom_cost', 'Estimated BOM or material cost'], ['licence', 'Licence']] },
    { key: 'research', title: 'Research and design', fields: [['key_paper', 'Key paper'], ['repository', 'Repository or design files']] },
    { key: 'assessment', title: 'Advantages and drawbacks', fields: [['advantages', 'Advantages'], ['drawbacks', 'Drawbacks']], note: 'As summarised in the research record, not an independent assessment.' },
    { key: 'caveats', title: 'Limitations and uncertainties', fields: [['limitations', 'Documented limitations'], ['notes', 'Notes and uncertainties']] },
    COMPARISON_SECTION
  ];
  // A touch-sensing product keeps its passport; the new columns join it only when the record has them.
  var sectionsFor = function (r) {
    if (!isTactile(r) && familyOf(r) !== 'unclassified') return GENERAL_SECTIONS;
    var extended = ['function', 'applications', 'technical_specifications', 'integration_requirements', 'limitations'].some(function (f) { return r && (f in r) && r[f]; }) || isSummary(r) && r && r.component_class;
    if (!extended) return SECTIONS.concat([COMPARISON_SECTION]);
    var out = [SECTIONS[0], FUNCTION_SECTION, SECTIONS[1]];
    if (!isSummary(r) && parseSpecs(r.technical_specifications).length || isSummary(r)) out.push(SPECS_SECTION);
    return out.concat(SECTIONS.slice(2).map(function (sec) {
      if (sec.key === 'integration') return { key: sec.key, title: sec.title, fields: sec.fields.concat([['integration_requirements', 'Integration requirements']]) };
      if (sec.key === 'caveats') return { key: sec.key, title: 'Limitations and uncertainties', fields: [['limitations', 'Documented limitations']].concat(sec.fields) };
      return sec;
    })).concat([COMPARISON_SECTION]);
  };
  var CAUTION = {
    resolution_count: 'Camera pixels are image resolution, not effective calibrated taxels.',
    spatial_resolution: 'Spatial resolution, localisation error and smallest feature are different quantities: read the wording.',
    force_resolution: 'Resolution, error and accuracy are different quantities.',
    sampling_rate: 'A rate can describe a different stream (internal sampling, output, camera) or a different mode.',
    list_price: 'Original currency, date and channel as recorded; not converted, not compared.',
    bom_cost: 'An author or third-party estimate of parts, not a sale price.',
    licence: 'Code, hardware design and the sale of a finished product can have different terms.'
  };
  // Reviewed cautions for products whose public record mixes conditions, models or claims.
  var PRODUCT_CAUTIONS = {
    'CMP-TAC-001': '60 fps is the paper\'s figure; the default interface streams VGA at 30 fps. The tactile image is not a calibrated force measurement by default.',
    'CMP-TAC-003': 'Early access is not open sale. The USD 1,200 to 2,500 range comes from third parties and is not an official price; it is never used in price comparisons.',
    'CMP-TAC-004': 'uSPa44, uSCu ALHA and the assembled hand kits have different taxel counts, rates and prices: each figure applies only to the model it names.',
    'CMP-TAC-005': 'Internal sampling (1 MHz) is not the output rate (up to 1,000 Hz). The record spans several models and form factors. The physical principle is inferred from the maker\'s "Magnetic Armour" name, not confirmed. Community drivers refer to GEN3, and the Western distributor figure does not name a GEN4 configuration: neither is equivalent to GEN4.',
    'CMP-TAC-010': 'Discontinued in the source: kept for reference and for existing datasets, not as a purchase recommendation.'
  };

  // Public summary rows (24 Nov 2026): every product is public at the fields of server/src/access/fields.js and carries
  // _summary: true. A field it does not carry is paid detail, never "not recorded": it says so.
  var isSummary = function (r) { return Boolean(r && r._summary); };
  var LOCK = '<span class="val lockv">With the subscription</span>';
  // Cautions that belong to the public fields (status, principle, scope of the record); the others cite paid values.
  var PUBLIC_CAUTIONS = {
    'CMP-TAC-003': 'Early access is not open sale.',
    'CMP-TAC-004': 'The record spans several models and kits: its specifications apply only to the model each names.',
    'CMP-TAC-005': 'The record spans several models and form factors. The physical principle is inferred from the maker\'s "Magnetic Armour" name, not confirmed.',
    'CMP-TAC-010': 'Discontinued in the source: kept for reference and for existing datasets, not as a purchase recommendation.'
  };
  var cautionOf = function (r) { return (isSummary(r) ? PUBLIC_CAUTIONS : PRODUCT_CAUTIONS)[r.component_id] || null; };

  var valueHtml = function (field, v, r) {
    if (isSummary(r) && !(field in r)) return LOCK;
    if (field === 'component_class') return '<span class="val">' + esc(familyLabel(familyOf(r))) + '</span>';
    var st = stateOf(v);
    if (st === 'not_recorded') return '<span class="na">Not recorded</span>';
    var text = String(v).trim();
    var tags = [];
    if (st !== 'value') tags.push('<span class="st st-' + st + '">' + STATE_LABEL[st] + '</span>');
    if (st === 'value' && varies(text)) tags.push('<span class="st st-varies">Varies by model or configuration</span>');
    evidenceTags(text).forEach(function (t) { tags.push('<span class="st">' + esc(t) + '</span>'); });
    if (field === 'list_price') {
      var p = priceOf(text);
      tags.unshift('<span class="st st-price">' + PRICE_LABEL[p.state] + '</span>');
      p.flags.forEach(function (f) { tags.push('<span class="st">' + PRICE_FLAG[f] + '</span>'); });
    }
    return '<span class="val' + (st !== 'value' ? ' muted' : '') + '">' + linkify(text) + '</span>' + (tags.length ? '<span class="sts">' + tags.join('') + '</span>' : '');
  };

  var specsHtml = function (r) {
    if (isSummary(r) && !('technical_specifications' in r)) return '<p>' + LOCK + '</p>';
    var specs = parseSpecs(r.technical_specifications);
    if (!specs.length) return '<p class="na">No structured specifications recorded.</p>';
    return '<div class="spec-wrap"><table class="specs"><thead><tr><th scope="col">Figure</th><th scope="col">Value</th><th scope="col">Conditions</th><th scope="col">Source</th></tr></thead><tbody>'
      + specs.map(function (x) {
        return '<tr><th scope="row">' + esc(metricLabel(x.metric)) + '</th><td><b>' + esc(x.value) + '</b>' + (x.unit ? ' ' + esc(x.unit) : '') + '</td><td>' + (x.conditions ? esc(x.conditions) : '<span class="na">Not stated</span>') + '</td><td><a href="' + esc(x.source_url) + '" rel="noopener noreferrer">' + esc(x.source_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) + '</a>' + (x.locator ? '<small>' + esc(x.locator) + '</small>' : '') + '<small>checked ' + esc(x.checked_at) + '</small></td></tr>';
      }).join('') + '</tbody></table></div>';
  };

  var comparisonNotesHtml = function (r) {
    if (isSummary(r) && !('comparison_summary' in r)) return '<p>' + LOCK + '</p>';
    var lines = String(r.comparison_summary || '').split('\n').map(function (l) { return l.match(/^([^:]{2,60}):\s*(.*)$/); }).filter(Boolean);
    if (!lines.length) return r.comparison_summary ? '<p>' + linkify(r.comparison_summary) + '</p>' : '<p class="na">No comparison notes recorded.</p>';
    return '<dl class="pp-kv">' + lines.map(function (m) { return '<dt>' + esc(m[1].trim()) + '</dt><dd data-f="comparison_summary"><span class="val">' + linkify(m[2].trim()) + '</span></dd>'; }).join('') + '</dl>';
  };

  var parseSources = function (text) {
    if (!text) return [];
    return String(text).split(/\n\s*\n/).map(function (block) {
      var lines = block.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      var url = lines.filter(function (l) { return /^https?:\/\//.test(l); })[0] || null;
      var get = function (re) { var l = lines.filter(function (x) { return re.test(x); })[0]; return l ? l.replace(re, '').trim() : null; };
      var subject = lines.filter(function (l) { return l !== url && !/^Accessed:|^Review status:/i.test(l); })[0] || null;
      return { subject: subject, url: url, accessed: get(/^Accessed:\s*/i), review: get(/^Review status:\s*/i) };
    }).filter(function (e) { return e.subject || e.url; });
  };

  // Review state as recorded: imported and still pending, checked for a stated scope only (the rest pending), or checked.
  var reviewState = function (r) {
    var s = String(r.review_status || '');
    if (/checked/i.test(s) && /pending/i.test(s)) return 'partial';
    if (/checked/i.test(s)) return 'checked';
    if (/pending/i.test(s)) return 'pending';
    return 'unknown';
  };
  var reviewBadge = function (r) {
    var st = reviewState(r);
    var s = String(r.review_status || '');
    if (st === 'pending') return '<span class="ev ev-pending">Imported research · original-source review pending</span>';
    if (st === 'partial') return '<span class="ev ev-partial">' + esc(s) + '</span>';
    if (st === 'checked') return '<span class="ev ev-checked">' + esc(s) + '</span>';
    return '<span class="ev">' + esc(s || 'Review state not recorded') + '</span>';
  };

  // The full passport of one product as HTML (sections as <section>, fields as a description list).
  var passportHtml = function (r, opts) {
    opts = opts || {};
    var h = opts.level || 2;
    var cls = classOf(r.group);
    var fam = familyOf(r);
    var famNote = FAMILIES[fam] && FAMILIES[fam].note ? '<p class="pp-caution"><b>Read with care.</b> ' + esc(FAMILIES[fam].note) + '</p>' : '';
    var sections = sectionsFor(r).map(function (sec) {
      if (sec.specs) return '<section class="pp-sec" data-sec="' + sec.key + '"><h' + h + '>' + esc(sec.title) + '</h' + h + '><p class="pp-note">' + esc(sec.note) + '</p>' + specsHtml(r) + '</section>';
      if (sec.comparison) return '<section class="pp-sec" data-sec="' + sec.key + '"><h' + h + '>' + esc(sec.title) + '</h' + h + '><p class="pp-note">' + esc(sec.note) + '</p>' + comparisonNotesHtml(r) + '</section>';
      var rows = sec.fields.map(function (f) {
        var caution = CAUTION[f[0]] ? '<small class="cau">' + esc(CAUTION[f[0]]) + '</small>' : '';
        return '<dt>' + esc(f[1]) + caution + '</dt><dd data-f="' + f[0] + '">' + valueHtml(f[0], r[f[0]], r) + '</dd>';
      }).join('');
      return '<section class="pp-sec" data-sec="' + sec.key + '"><h' + h + '>' + esc(sec.title) + '</h' + h + '>' + (sec.note ? '<p class="pp-note">' + esc(sec.note) + '</p>' : '') + '<dl class="pp-kv">' + rows + '</dl></section>';
    }).join('');
    var sources = parseSources(r.sources);
    if (isSummary(r)) {
      var pub = '<section class="pp-sec" data-sec="sources"><h' + h + '>Sources and evidence</h' + h + '>'
        + '<p class="pp-note">' + reviewBadge(r) + ' A reachable link is not a verified claim.</p>' + scopeHtml(r)
        + (r.main_source_url ? '<p class="pp-main">Main source: ' + linkify(r.main_source_url) + '</p>' : '<p class="pp-main"><span class="na">No main source recorded</span></p>')
        + '<p class="pp-note">The source of each specification, with its access date and review state, is part of the full passport with the subscription.</p></section>';
      var pc = cautionOf(r) ? '<p class="pp-caution"><b>Read with care.</b> ' + esc(cautionOf(r)) + '</p>' : '';
      return '<div class="pp pp-summary" data-id="' + esc(r.component_id) + '" data-class="' + cls + '" data-fam="' + fam + '">' + pc + famNote + sections + pub + '</div>';
    }
    var src = '<section class="pp-sec" data-sec="sources"><h' + h + '>Sources and evidence</h' + h + '>'
      + '<p class="pp-note">' + reviewBadge(r) + ' A reachable link is not a verified claim: each reference keeps the subject it supports and its own review state.</p>' + scopeHtml(r)
      + (r.main_source_url ? '<p class="pp-main">Main source: ' + linkify(r.main_source_url) + '</p>' : '')
      + '<ol class="srcs">' + sources.map(function (s) {
        return '<li><b>' + esc(s.subject || 'Reference') + '</b>' + (s.url ? ' ' + linkify(s.url) : '') + '<small>' + (s.accessed ? 'Accessed ' + esc(s.accessed) : 'Access date not recorded') + (s.review ? ' · ' + esc(s.review) : '') + '</small></li>';
      }).join('') + '</ol></section>';
    var caution = PRODUCT_CAUTIONS[r.component_id] ? '<p class="pp-caution"><b>Read with care.</b> ' + esc(PRODUCT_CAUTIONS[r.component_id]) + '</p>' : '';
    return '<div class="pp" data-id="' + esc(r.component_id) + '" data-class="' + cls + '" data-fam="' + fam + '">' + caution + famNote + sections + src + '</div>';
  };

  // Facets of one product for the catalogue filters.
  var facetsOf = function (r) {
    var touch = isTactile(r) || familyOf(r) === 'unclassified';
    return {
      fam: familyOf(r), cls: classOf(r.group), principle: touch ? principleOf(r.principle) : 'not_applicable', quantities: touch ? quantitiesOf(r.measured) : [], interfaces: interfacesOf(r.interface),
      ros: rosOf(r.software), licence: licenceOf(r.licence), price: priceOf(r.list_price).state
    };
  };

  // Comparison matrix for up to three products: every passport field, grouped, with value states.
  // A metric cell: the value with its unit and conditions, or why there is none.
  var metricCell = function (r, key) {
    if (isSummary(r) && !('technical_specifications' in r)) return LOCK;
    var m = parseSpecs(r.technical_specifications).filter(function (x) { return x.metric === key; });
    if (!m.length) return '<span class="na">Not recorded</span>';
    return m.map(function (x) { return '<span class="val">' + esc(x.value) + (x.unit ? ' ' + esc(x.unit) : '') + '</span>' + (x.conditions ? '<small class="cond">' + esc(x.conditions) + '</small>' : '') + '<small class="cond"><a href="' + esc(x.source_url) + '" rel="noopener noreferrer">source</a>' + (x.locator ? ', ' + esc(x.locator) : '') + '</small>'; }).join('<br>');
  };
  var compareHtml = function (rows) {
    if (!rows.length) return '<p class="empty">Choose up to three products to compare.</p>';
    if (!rows.every(function (r) { return isTactile(r) || familyOf(r) === 'unclassified'; })) return compareFamilies(rows);
    var head = '<thead><tr><th scope="col" class="ck">Field</th>' + rows.map(function (r) { return '<th scope="col"><a href="/components/' + esc(String(r.component_id).toLowerCase()) + '/">' + esc(r.name) + '</a><small>' + esc(CLASS_LABEL[classOf(r.group)]) + '</small></th>'; }).join('') + '</tr></thead>';
    var body = SECTIONS.map(function (sec) {
      return '<tbody><tr class="cg"><th scope="colgroup" colspan="' + (rows.length + 1) + '">' + esc(sec.title) + '</th></tr>' + sec.fields.map(function (f) {
        return '<tr><th scope="row" class="ck">' + esc(f[1]) + (CAUTION[f[0]] ? '<small class="cau">' + esc(CAUTION[f[0]]) + '</small>' : '') + '</th>' + rows.map(function (r) { return '<td data-p="' + esc(r.name) + '">' + valueHtml(f[0], r[f[0]], r) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody>';
    }).join('');
    // The family-specific columns (26 Nov 2026), after the touch passport fields: what each does, its structured figures
    // (every metric any of them records, with conditions and source) and its integration and limits.
    var group = function (title, cells) { return cells.length ? '<tbody><tr class="cg"><th scope="colgroup" colspan="' + (rows.length + 1) + '">' + esc(title) + '</th></tr>' + cells.join('') + '</tbody>' : ''; };
    var fieldRow = function (f) { return '<tr><th scope="row" class="ck">' + esc(f[1]) + '</th>' + rows.map(function (r) { return '<td data-p="' + esc(r.name) + '">' + valueHtml(f[0], r[f[0]], r) + '</td>'; }).join('') + '</tr>'; };
    var has = function (f) { return rows.some(function (r) { return (isSummary(r) && !(f in r)) || r[f]; }); };
    var metrics = [];
    rows.forEach(function (r) { parseSpecs(r.technical_specifications).forEach(function (x) { if (metrics.indexOf(x.metric) < 0) metrics.push(x.metric); }); });
    var extra = group('What it does', [['function', 'Function'], ['applications', 'Applications, as stated by the source']].filter(function (f) { return has(f[0]); }).map(fieldRow))
      + group('Structured figures', metrics.map(function (k) { return '<tr><th scope="row" class="ck">' + esc(metricLabel(k)) + '</th>' + rows.map(function (r) { return '<td data-p="' + esc(r.name) + '">' + metricCell(r, k) + '</td>'; }).join('') + '</tr>'; }))
      + group('Integration and limits', [['integration_requirements', 'Integration requirements'], ['limitations', 'Documented limitations'], ['comparison_summary', 'Comparison notes']].filter(function (f) { return has(f[0]); }).map(fieldRow));
    var cautions = rows.filter(function (r) { return cautionOf(r); }).map(function (r) { return '<li><b>' + esc(r.name) + ':</b> ' + esc(cautionOf(r)) + '</li>'; }).join('');
    return (cautions ? '<ul class="cmp-cautions">' + cautions + '</ul>' : '') + '<table class="cmp"><caption class="sr">Products compared field by field, as recorded</caption>' + head + body + extra + '</table>';
  };

  // Products outside touch sensing: the shared fields, then the figures of their family. Different families are compared
  // on what they share only: a reducer's torque and a hand's grip force are not one scale.
  var compareFamilies = function (rows) {
    var fams = rows.map(familyOf).filter(function (f, i, a) { return a.indexOf(f) === i; });
    var same = fams.length === 1 && FAMILIES[fams[0]];
    var metrics = (same ? FAMILIES[fams[0]].metrics : []).concat(COMMON_METRICS);
    var used = metrics.filter(function (k) { return rows.some(function (r) { return isSummary(r) || parseSpecs(r.technical_specifications).some(function (x) { return x.metric === k; }); }); });
    var head = '<thead><tr><th scope="col" class="ck">Field</th>' + rows.map(function (r) { return '<th scope="col"><a href="' + pathOf(r.component_id) + '">' + esc(r.name) + '</a><small>' + esc(familyLabel(familyOf(r))) + ' · ' + esc(CLASS_LABEL[classOf(r.group)]) + '</small></th>'; }).join('') + '</tr></thead>';
    var basic = [['manufacturer', 'Manufacturer or laboratory'], ['status', 'Current status'], ['function', 'Function'], ['principle', 'Technology or operating principle'], ['interface', 'Interface and connectivity'], ['weight', 'Weight as recorded'], ['list_price', 'List price (currency, date, source)'], ['bom_cost', 'Estimated BOM or material cost'], ['integration_requirements', 'Integration requirements'], ['limitations', 'Documented limitations']];
    var body = '<tbody><tr class="cg"><th scope="colgroup" colspan="' + (rows.length + 1) + '">Identity and use</th></tr>' + basic.map(function (f) {
      return '<tr><th scope="row" class="ck">' + esc(f[1]) + '</th>' + rows.map(function (r) { return '<td data-p="' + esc(r.name) + '">' + valueHtml(f[0], r[f[0]], r) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody>'
      + (used.length ? '<tbody><tr class="cg"><th scope="colgroup" colspan="' + (rows.length + 1) + '">' + (same ? esc(FAMILIES[fams[0]].label) + ' figures' : 'Figures every family can have') + '</th></tr>' + used.map(function (k) {
        return '<tr><th scope="row" class="ck">' + esc(metricLabel(k)) + '</th>' + rows.map(function (r) { return '<td data-p="' + esc(r.name) + '">' + metricCell(r, k) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody>' : '');
    var note = same ? '<p class="cmp-note">Figures as each maker or paper states them, with their conditions. Different conditions (momentary or continuous, voltage, precision) make two numbers not comparable even in the same row.</p>'
      : '<p class="cmp-note">These products are of different families (' + esc(fams.map(familyLabel).join(', ')) + '): only the fields they share are compared. Compare products of one family to see its figures side by side.</p>';
    return note + '<table class="cmp"><caption class="sr">Products compared field by field, as recorded</caption>' + head + body + '</table>';
  };

  var pathOf = function (id) { return '/components/' + String(id).toLowerCase() + '/'; };
  var clip = function (v, n) { var s = String(v == null ? '' : v).trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };

  // One catalogue card. `makers` is ready HTML (public company links on static pages, the recorded text otherwise).
  var cardHtml = function (r, makers) {
    var f = facetsOf(r);
    var summary = isSummary(r);
    // Quick facts: the public identity for a summary; for a full touch record its touch fields; for other families up to
    // three of the family's own figures with their units, else what the record states about interface and weight.
    var famFacts = function () {
      var specs = parseSpecs(r.technical_specifications);
      var fam = FAMILIES[f.fam];
      var picked = (fam ? fam.metrics.concat(COMMON_METRICS) : COMMON_METRICS).map(function (k) { return specs.filter(function (x) { return x.metric === k; })[0]; }).filter(Boolean).slice(0, 3);
      if (picked.length) return picked.map(function (x) { return [metricLabel(x.metric), x.value + (x.unit ? ' ' + x.unit : '') + (x.conditions ? ' (' + x.conditions + ')' : '')]; });
      return [['Interface', r.interface], ['Weight', r.weight], ['Status', r.status]];
    };
    var quick = (summary ? [['Country', r.country], ['Launch or publication', r.year], ['Status', r.status]] : f.principle === 'not_applicable' ? famFacts() : [['Taxels or camera', r.resolution_count], ['Rate', r.sampling_rate], ['Interface', r.interface]]).map(function (q) {
      var st = stateOf(q[1]);
      return '<div><dt>' + q[0] + '</dt><dd' + (st !== 'value' ? ' class="muted"' : '') + '>' + (st === 'value' ? esc(clip(q[1], 90)) : STATE_LABEL[st]) + '</dd></div>';
    }).join('');
    var p = priceOf(r.list_price);
    var touch = f.principle !== 'not_applicable';
    return '<li class="pc" data-id="' + esc(r.component_id) + '" data-fam="' + f.fam + '" data-class="' + f.cls + '" data-principle="' + f.principle + '" data-q="' + f.quantities.join(' ') + '" data-if="' + f.interfaces.join(' ') + '" data-ros="' + f.ros + '" data-licence="' + f.licence + '">'
      + '<p class="pc-k"><span class="fam-l">' + esc(familyLabel(f.fam)) + '</span><span class="cls cls-' + f.cls + '">' + esc(CLASS_LABEL[f.cls]) + '</span>' + (touch ? '<span>' + esc(principleLabel(f.principle)) + '</span>' : '') + '</p>'
      + '<h3><a href="' + pathOf(r.component_id) + '">' + esc(r.name) + '</a></h3>'
      + '<p class="pc-m">' + (makers || esc(r.manufacturer || 'Maker not recorded')) + '</p>'
      + '<p class="pc-q">' + esc(clip(r['function'] || r.measured, 170)) + '</p>'
      + '<dl class="pc-f">' + quick + '</dl>'
      + (summary
        ? '<p class="pc-b"><span class="st st-lock">Specifications, price and sources with the subscription</span>' + (reviewState(r) !== 'pending' && reviewState(r) !== 'unknown' ? '<span class="st st-checked">' + (reviewState(r) === 'partial' ? 'Sources checked in part' : 'Sources checked') + '</span>' : '') + (cautionOf(r) ? '<span class="st st-care">Read with care</span>' : '') + '</p>'
        : '<p class="pc-b"><span class="st st-price">' + PRICE_LABEL[p.state] + '</span>' + p.flags.map(function (x) { return '<span class="st">' + PRICE_FLAG[x] + '</span>'; }).join('') + (PRODUCT_CAUTIONS[r.component_id] ? '<span class="st st-care">Read with care</span>' : '') + '</p>')
      + '<p class="pc-a"><a href="' + pathOf(r.component_id) + '">Passport</a><button type="button" class="pc-cmp" data-id="' + esc(r.component_id) + '" aria-pressed="false">Compare</button></p></li>';
  };

  root.WHComponents = {
    pathOf: pathOf, clip: clip, cardHtml: cardHtml,
    esc: esc, linkify: linkify, GROUPS: GROUPS, CLASS_ORDER: CLASS_ORDER, CLASS_LABEL: CLASS_LABEL, classOf: classOf,
    PRINCIPLES: PRINCIPLES, principleOf: principleOf, principleLabel: principleLabel, QUANTITIES: QUANTITIES, quantitiesOf: quantitiesOf,
    INTERFACES: INTERFACES, interfacesOf: interfacesOf, rosOf: rosOf, ROS_LABEL: ROS_LABEL, licenceOf: licenceOf, LICENCE_LABEL: LICENCE_LABEL,
    priceOf: priceOf, PRICE_LABEL: PRICE_LABEL, stateOf: stateOf, varies: varies, evidenceTags: evidenceTags, SECTIONS: SECTIONS, CAUTION: CAUTION,
    PRODUCT_CAUTIONS: PRODUCT_CAUTIONS, PUBLIC_CAUTIONS: PUBLIC_CAUTIONS, isSummary: isSummary, cautionOf: cautionOf, valueHtml: valueHtml, parseSources: parseSources, reviewBadge: reviewBadge, passportHtml: passportHtml,
    facetsOf: facetsOf, compareHtml: compareHtml,
    FAMILIES: FAMILIES, FAMILY_ORDER: FAMILY_ORDER, COMMON_METRICS: COMMON_METRICS, familyOf: familyOf, familyLabel: familyLabel, isTactile: isTactile,
    METRIC_LABEL: METRIC_LABEL, metricLabel: metricLabel, parseSpecs: parseSpecs, specsHtml: specsHtml, EVIDENCE_LABEL: EVIDENCE_LABEL, scopeHtml: scopeHtml,
    reviewState: reviewState, sectionsFor: sectionsFor
  };
}(typeof window !== 'undefined' ? window : globalThis));
