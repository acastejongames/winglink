import type { GlobalLeaderRow, QuizQuestion, SeasonalChallenge } from '../types'
import { daysAhead } from '../utils'

export const quizQuestions: QuizQuestion[] = [
  // ── Guess the Aircraft ─────────────────────────────────────────────
  { id: 'qa1', mode: 'aircraft', difficulty: 'easy', image: 'images/f35.jpg', prompt: 'Which aircraft is this?', options: ['F-35 Lightning II', 'F-22 Raptor', 'Eurofighter Typhoon', 'Saab Gripen'], answer: 0, fact: 'The F-35 comes in three variants: conventional A, short-takeoff B, and carrier-capable C.' },
  { id: 'qa2', mode: 'aircraft', difficulty: 'easy', image: 'images/f22-mountains.jpg', prompt: 'Which aircraft is this?', options: ['Su-57', 'Chengdu J-20', 'F-22 Raptor', 'F-15 Eagle'], answer: 2, fact: 'The F-22 can supercruise — fly supersonic without afterburners.' },
  { id: 'qa3', mode: 'aircraft', difficulty: 'easy', image: 'images/f16-afterburner.jpg', prompt: 'Which aircraft is this?', options: ['F-16 Fighting Falcon', 'F/A-18 Hornet', 'Mirage 2000', 'JAS 39 Gripen'], answer: 0, fact: 'Over 4,600 F-16s have been built — more than any other modern Western fighter.' },
  { id: 'qa4', mode: 'aircraft', difficulty: 'easy', image: 'images/a350.jpg', prompt: 'Which aircraft is this?', options: ['Boeing 787', 'Airbus A350', 'Airbus A330', 'Boeing 777'], answer: 1, fact: 'The A350 airframe is more than 50% carbon-fibre composite by weight.' },
  { id: 'qa5', mode: 'aircraft', difficulty: 'easy', image: 'images/b787.jpg', prompt: 'Which aircraft is this?', options: ['A350-900', 'Boeing 767', 'Boeing 787-9', 'A330neo'], answer: 2, fact: 'The 787 was the first airliner with a mainly composite airframe.' },
  { id: 'qa6', mode: 'aircraft', difficulty: 'medium', image: 'images/fa18-airshow.jpg', prompt: 'Which aircraft is this?', options: ['F/A-18C Hornet', 'F/A-18E Super Hornet', 'EA-18G Growler', 'AV-8B Harrier II'], answer: 1, fact: 'The Super Hornet is about 25% larger than the original Hornet it replaced.' },
  { id: 'qa7', mode: 'aircraft', difficulty: 'medium', image: 'images/typhoon.jpg', prompt: 'Which aircraft is this?', options: ['Dassault Rafale', 'Saab Gripen', 'Eurofighter Typhoon', 'Tornado GR.4'], answer: 2, fact: 'The Typhoon’s canard-delta layout gives it outstanding instant-turn performance.' },
  { id: 'qa8', mode: 'aircraft', difficulty: 'medium', image: 'images/gripen.jpg', prompt: 'Which aircraft is this?', options: ['JAS 39 Gripen', 'F-16 Fighting Falcon', 'Mirage F1', 'MiG-29'], answer: 0, fact: 'Gripen can operate from road strips — a Cold War requirement of the Swedish Air Force.' },
  { id: 'qa9', mode: 'aircraft', difficulty: 'hard', image: 'images/f14-launch.jpg', prompt: 'Which aircraft is this?', options: ['F-14A Tomcat', 'F-14D Super Tomcat', 'A-6 Intruder', 'EA-6B Prowler'], answer: 0, fact: 'This is an F-14A with TF30 engines — the variant that defined the early Tomcat years.' },
  { id: 'qa10', mode: 'aircraft', difficulty: 'hard', image: 'images/su57.jpg', prompt: 'Which aircraft is this?', options: ['MiG-35', 'Su-57 Felon', 'Su-35 Flanker-E', 'Su-75 Checkmate'], answer: 1, fact: 'The Su-57 entered service in 2020 — Russia’s first operational fifth-generation fighter.' },
  { id: 'qa11', mode: 'aircraft', difficulty: 'hard', image: 'images/j20.jpg', prompt: 'Which aircraft is this?', options: ['J-16', 'J-10C', 'J-20 Mighty Dragon', 'FC-31'], answer: 2, fact: 'The J-20 uses canards ahead of a delta wing — unusual for a stealth fighter.' },
  { id: 'qa12', mode: 'aircraft', difficulty: 'medium', image: 'images/b747.webp', prompt: 'Which aircraft is this?', options: ['Boeing 707', 'Boeing 747', 'DC-10', 'Lockheed L-1011'], answer: 1, fact: 'The 747’s upper deck hump started as a design for a freighter with a nose door.' },
  { id: 'qa13', mode: 'aircraft', difficulty: 'easy', image: 'images/concorde.jpg', prompt: 'Which aircraft is this?', options: ['Concorde', 'Tu-144', 'Vickers VC10', 'DH Comet'], answer: 0, fact: 'Concorde crossed the Atlantic in about three hours at Mach 2.04.' },
  { id: 'qa14', mode: 'aircraft', difficulty: 'medium', image: 'images/sr71.jpg', prompt: 'Which aircraft is this?', options: ['U-2 Dragon Lady', 'SR-71 Blackbird', 'A-12 Oxcart', 'B-58 Hustler'], answer: 1, fact: 'The SR-71 still holds the official absolute speed record: 3,529.6 km/h.' },
  { id: 'qa15', mode: 'aircraft', difficulty: 'medium', image: 'images/chinook.jpg', prompt: 'Which aircraft is this?', options: ['CH-53 Sea Stallion', 'CH-47 Chinook', 'V-22 Osprey', 'Mi-26 Halo'], answer: 1, fact: 'The Chinook’s tandem rotors can lift around 10 tonnes of cargo.' },
  { id: 'qa16', mode: 'aircraft', difficulty: 'hard', image: 'images/b2.jpg', prompt: 'Which aircraft is this?', options: ['B-21 Raider', 'B-2 Spirit', 'B-1B Lancer', 'B-52 Stratofortress'], answer: 1, fact: 'Only 21 B-2s were built, each roughly the cost of its weight in gold — almost.' },
  { id: 'qa17', mode: 'aircraft', difficulty: 'hard', image: 'images/spitfire.jpg', prompt: 'Which mark family of aircraft is this?', options: ['Spitfire', 'Hurricane', 'Mustang', 'Tempest'], answer: 0, fact: 'More than 20,000 Spitfires were built across more than 24 major marks.' },
  { id: 'qa18', mode: 'aircraft', difficulty: 'easy', image: 'images/cessna.jpg', prompt: 'Which aircraft is this?', options: ['Piper PA-28', 'Cessna 172', 'DA40 Diamond', 'Beech Bonanza'], answer: 1, fact: 'The Cessna 172 is the most produced aircraft in history.' },
  { id: 'qa19', mode: 'aircraft', difficulty: 'hard', image: 'images/mq9.jpg', prompt: 'Which aircraft is this?', options: ['MQ-1 Predator', 'MQ-9 Reaper', 'RQ-4 Global Hawk', 'TB2 Bayraktar'], answer: 1, fact: 'The MQ-9 can loiter for up to 27 hours on station.' },
  { id: 'qa20', mode: 'aircraft', difficulty: 'medium', image: 'images/helicopters.jpg', prompt: 'Which attack helicopter is prominent here?', options: ['AH-1Z Viper', 'AH-64 Apache', 'Ka-52 Alligator', 'Tiger UHT'], answer: 1, fact: 'The Apache’s chain gun is slaved to the crew member’s helmet sight.' },

  // ── Guess the Manufacturer ────────────────────────────────────────
  { id: 'qm1', mode: 'manufacturer', difficulty: 'easy', image: 'images/a350.jpg', prompt: 'Who builds this aircraft?', options: ['Boeing', 'Airbus', 'Embraer', 'Bombardier'], answer: 1, fact: 'Airbus was founded in 1970 as a European consortium.' },
  { id: 'qm2', mode: 'manufacturer', difficulty: 'easy', image: 'images/b787.jpg', prompt: 'Who builds this aircraft?', options: ['Airbus', 'Boeing', 'McDonnell Douglas', 'Lockheed'], answer: 1, fact: 'Boeing’s 787 programme introduced large-scale composite airframe manufacturing.' },
  { id: 'qm3', mode: 'manufacturer', difficulty: 'medium', image: 'images/gripen.jpg', prompt: 'Who builds this aircraft?', options: ['Dassault', 'Saab', 'Embraer', 'Eurofighter GmbH'], answer: 1, fact: 'Saab’s car-making heritage shaped Gripen’s simple, maintainable design.' },
  { id: 'qm4', mode: 'manufacturer', difficulty: 'medium', image: 'images/f14-launch.jpg', prompt: 'Who built this fighter?', options: ['Grumman', 'McDonnell', 'North American', 'Vought'], answer: 0, fact: 'Grumman was also famous for the F-14’s earlier work on the F9F Panther.' },
  { id: 'qm5', mode: 'manufacturer', difficulty: 'hard', image: 'images/spitfire.jpg', prompt: 'Who designed this fighter?', options: ['Hawker', 'Supermarine', 'de Havilland', 'Fairey'], answer: 1, fact: 'R.J. Mitchell’s team at Supermarine designed the Spitfire from racing-seaplane roots.' },
  { id: 'qm6', mode: 'manufacturer', difficulty: 'hard', image: 'images/sr71.jpg', prompt: 'Who built this aircraft?', options: ['Boeing', 'Northrop', 'Lockheed Skunk Works', 'Convair'], answer: 2, fact: 'Kelly Johnson’s Skunk Works delivered the SR-71 in astonishing secrecy.' },
  { id: 'qm7', mode: 'manufacturer', difficulty: 'easy', image: 'images/cessna.jpg', prompt: 'Who builds this aircraft?', options: ['Piper', 'Cessna', 'Cirrus', 'Beechcraft'], answer: 1, fact: 'Cessna is now part of Textron Aviation.' },
  { id: 'qm8', mode: 'manufacturer', difficulty: 'medium', image: 'images/chinook.jpg', prompt: 'Who builds this helicopter today?', options: ['Sikorsky', 'Boeing Rotorcraft', 'Bell', 'Leonardo'], answer: 1, fact: 'The design began at Vertol before Boeing acquired the company.' },

  // ── Guess the Cockpit ─────────────────────────────────────────────
  { id: 'qc1', mode: 'cockpit', difficulty: 'medium', image: 'images/cockpit-fighter.jpg', prompt: 'Whose office is this?', options: ['F-22 Raptor', 'F-35 Lightning II', 'Eurofighter Typhoon', 'Gripen E'], answer: 0, fact: 'The Raptor cockpit has no physical HUD — information is combined on large tactical displays.' },
  { id: 'qc2', mode: 'cockpit', difficulty: 'easy', image: 'images/cockpit-airliner.jpg', prompt: 'Which family of airliner flight deck is this?', options: ['Airbus A320 family', 'Boeing 737', 'Embraer E2', 'A220'], answer: 0, fact: 'Airbus fly-by-wire airliners use side sticks instead of traditional control columns.' },
  { id: 'qc3', mode: 'cockpit', difficulty: 'medium', image: 'images/cockpit-airliner-2.jpg', prompt: 'What kind of flight deck is shown?', options: ['Regional turboprop', 'Modern glass-cockpit airliner', 'Business jet', 'Cargo freighter (classic)'], answer: 1, fact: 'Glass cockpits replaced analogue “steam gauges” with interactive displays.' },
  { id: 'qc4', mode: 'cockpit', difficulty: 'hard', image: 'images/cockpit-airliner.jpg', prompt: 'What is the pilot on the left likely doing in this photo?', options: ['Taxiing', 'Cruising near sunset', 'Performing a CAT III approach', 'Loading the flight plan on the ground'], answer: 1, fact: 'Golden-hour cruise shots are a favourite of flight-deck photographers — always within operator rules.' },

  // ── Silhouette Challenge ──────────────────────────────────────────
  { id: 'qs1', mode: 'silhouette', difficulty: 'medium', image: 'images/concorde.jpg', prompt: 'Name this silhouette.', options: ['Concorde', 'Tu-144', 'Vulcan', 'B-1 Lancer'], answer: 0, fact: 'Concorde’s ogival delta wing is unmistakable in silhouette.' },
  { id: 'qs2', mode: 'silhouette', difficulty: 'easy', image: 'images/b747.webp', prompt: 'Name this silhouette.', options: ['DC-8', 'Boeing 747', 'A380', 'B-52'], answer: 1, fact: 'The 747 hump is visible from kilometres away.' },
  { id: 'qs3', mode: 'silhouette', difficulty: 'hard', image: 'images/b2.jpg', prompt: 'Name this silhouette.', options: ['B-21', 'B-2 Spirit', 'Flying wing N-9M', 'X-47B'], answer: 1, fact: 'The B-2’s flying wing has no tail surfaces at all.' },
  { id: 'qs4', mode: 'silhouette', difficulty: 'medium', image: 'images/spitfire.jpg', prompt: 'Name this silhouette.', options: ['Hurricane', 'Spitfire', 'Yak-3', 'Bf 109'], answer: 1, fact: 'The Spitfire’s elliptical wing is the most recognisable planform of WWII.' },
  { id: 'qs5', mode: 'silhouette', difficulty: 'hard', image: 'images/f14-launch.jpg', prompt: 'Name this silhouette.', options: ['F-14 Tomcat', 'F-15 Eagle', 'Su-27', 'Tornado ADV'], answer: 0, fact: 'Variable-geometry wings: swept for speed, spread for landing.' },
  { id: 'qs6', mode: 'silhouette', difficulty: 'easy', image: 'images/chinook.jpg', prompt: 'Name this silhouette.', options: ['Sea King', 'CH-47 Chinook', 'Merlin', 'Black Hawk'], answer: 1, fact: 'Tandem rotors, no tail rotor — pure Chinook.' },

  // ── Guess the Country ─────────────────────────────────────────────
  { id: 'qg1', mode: 'country', difficulty: 'easy', image: 'images/gripen.jpg', prompt: 'Which country is this fighter from?', options: ['Sweden', 'Switzerland', 'Finland', 'Austria'], answer: 0, fact: 'Gripen was born from Sweden’s dispersed-operations doctrine.' },
  { id: 'qg2', mode: 'country', difficulty: 'easy', image: 'images/j20.jpg', prompt: 'Which country is this fighter from?', options: ['Russia', 'China', 'South Korea', 'India'], answer: 1, fact: 'The J-20 is built by Chengdu Aerospace Corporation.' },
  { id: 'qg3', mode: 'country', difficulty: 'medium', image: 'images/su57.jpg', prompt: 'Which country is this fighter from?', options: ['China', 'Russia', 'Ukraine', 'Iran'], answer: 1, fact: 'The Su-57 first flew in 2010 and entered service in 2020.' },
  { id: 'qg4', mode: 'country', difficulty: 'medium', image: 'images/typhoon.jpg', prompt: 'Which countries jointly build this fighter?', options: ['France, Germany, Spain', 'UK, Germany, Italy, Spain', 'Sweden, Norway, Finland, Denmark', 'UK, USA, Canada'], answer: 1, fact: 'The Eurofighter consortium is a four-nation programme.' },
  { id: 'qg5', mode: 'country', difficulty: 'hard', image: 'images/concorde.jpg', prompt: 'Which two countries developed this airliner?', options: ['USA and UK', 'France and UK', 'France and Germany', 'UK and Spain'], answer: 1, fact: 'Concorde was an Anglo-French project — the name merges “concordance” in both languages.' },
  { id: 'qg6', mode: 'country', difficulty: 'easy', image: 'images/f22-mountains.jpg', prompt: 'Which country is this fighter from?', options: ['USA', 'Russia', 'Israel', 'Japan'], answer: 0, fact: 'The F-22 is built by Lockheed Martin with Boeing.' },

  // ── Aviation Trivia ───────────────────────────────────────────────
  { id: 'qt1', mode: 'trivia', difficulty: 'easy', prompt: 'What does “VTOL” stand for?', options: ['Vertical Take-Off and Landing', 'Variable Thrust Outboard Lift', 'Vertical Thrust Over Load', 'Venturi Turbo Oil Line'], answer: 0, fact: 'VTOL aircraft like the F-35B can hover and land vertically.' },
  { id: 'qt2', mode: 'trivia', difficulty: 'easy', prompt: 'What is the standard international distress call for an aircraft?', options: ['Pan-pan', 'Mayday', 'Squawk 7700', 'Roger'], answer: 1, fact: 'Mayday comes from the French “m’aider” — help me.' },
  { id: 'qt3', mode: 'trivia', difficulty: 'medium', prompt: 'What does a squawk code of 7600 indicate?', options: ['Hijack', 'Radio failure', 'Navigation failure', 'Emergency fuel'], answer: 1, fact: '7600 means the aircraft has lost radio communications.' },
  { id: 'qt4', mode: 'trivia', difficulty: 'medium', prompt: 'Which surface controls an aircraft’s roll?', options: ['Elevator', 'Rudder', 'Ailerons', 'Flaps'], answer: 2, fact: 'Ailerons are on the wing trailing edges, working in opposite pairs.' },
  { id: 'qt5', mode: 'trivia', difficulty: 'hard', prompt: 'What is “mach tuck”?', options: ['Speedbrake deployment', 'Nose-down tendency near Mach 1', 'Engine surge at high Mach', 'Wing sweep actuation'], answer: 1, fact: 'As the centre of lift shifts aft near Mach 1, the nose pitches down — mach tuck.' },
  { id: 'qt6', mode: 'trivia', difficulty: 'medium', prompt: 'What does “deadstick” mean?', options: ['Engine failure landing', 'Night landing without lights', 'Landing with gear up', 'Simulated engine failure'], answer: 0, fact: 'A deadstick landing is made with the engine shut down or failed.' },
  { id: 'qt7', mode: 'trivia', difficulty: 'hard', prompt: 'Why do airliner windows have rounded corners?', options: ['Aerodynamics', 'Fatigue cracking at square corners', 'De-icing flow', 'Cabin pressurisation comfort'], answer: 1, fact: 'Square windows concentrate stress — a lesson learned from the Comet disasters.' },
  { id: 'qt8', mode: 'trivia', difficulty: 'easy', prompt: 'What is the busiest commercial aircraft type family in history?', options: ['Boeing 737', 'Airbus A320', 'Boeing 747', 'DC-3'], answer: 0, fact: 'The 737 family has the largest number of deliveries of any jet airliner.' },

  // ── Aviation History Quiz ─────────────────────────────────────────
  { id: 'qh1', mode: 'history', difficulty: 'easy', prompt: 'In what year did the Wright Brothers make their first powered flight?', options: ['1903', '1899', '1908', '1911'], answer: 0, fact: '17 December 1903 at Kitty Hawk — 12 seconds, 36 metres.' },
  { id: 'qh2', mode: 'history', difficulty: 'medium', prompt: 'Which aircraft flew the first non-stop Atlantic crossing in 1919?', options: ['Spirit of St. Louis', 'Vickers Vimy', 'R34 airship', 'NC-4 flying boat'], answer: 1, fact: 'A Vickers Vimy flew Newfoundland to Ireland in about 16 hours.' },
  { id: 'qh3', mode: 'history', difficulty: 'medium', prompt: 'The “Miracle on the Hudson” occurred in which year?', options: ['2005', '2009', '2013', '2017'], answer: 1, fact: 'US Airways 1549 ditched in the Hudson on 15 January 2009 — everyone survived.' },
  { id: 'qh4', mode: 'history', difficulty: 'hard', prompt: 'Which record did the SR-71 set in 1990 that still stands?', options: ['Highest altitude', 'Absolute speed record for a manned air-breathing aircraft', 'Longest non-stop flight', 'Fastest climb to 25,000 m'], answer: 1, fact: '3,529.6 km/h between Washington and Los Angeles — an absolute record.' },
  { id: 'qh5', mode: 'history', difficulty: 'hard', prompt: 'What caused the progressive development halt of the Concorde programme in part?', options: ['Engine failure', 'The 1973 oil crisis and overflight bans', 'Wing crack discoveries', 'Loss of prototype'], answer: 1, fact: 'Fuel economics and noise overflight restrictions shrunk the market.' },
  { id: 'qh6', mode: 'history', difficulty: 'easy', prompt: 'Which fighter dominated the Battle of Britain alongside the Hurricane?', options: ['Spitfire', 'Mustang', 'Buffalo', 'Gladiator'], answer: 0, fact: 'The Spitfire famously went after fighters; the Hurricane targeted bombers.' },
  { id: 'qh7', mode: 'history', difficulty: 'medium', prompt: 'When did the Airbus A320 enter service?', options: ['1984', '1988', '1992', '1996'], answer: 1, fact: 'March 1988 with Air France — the first fly-by-wire airliner in service.' },

  // ── Aircraft Comparison ───────────────────────────────────────────
  { id: 'qc10', mode: 'comparison', difficulty: 'easy', prompt: 'Which aircraft has the higher top speed?', left: { name: 'F-22 Raptor', image: 'images/f22-mountains.jpg', value: 'Mach 2.25' }, right: { name: 'F-16 Fighting Falcon', image: 'images/f16-afterburner.jpg', value: 'Mach 2.0' }, answer: 0, fact: 'Supercruise plus twin engines push the Raptor ahead.' },
  { id: 'qc11', mode: 'comparison', difficulty: 'medium', prompt: 'Which aircraft has the longer range?', left: { name: 'B-2 Spirit', image: 'images/b2.jpg', value: '11,100 km' }, right: { name: 'F-22 Raptor', image: 'images/f22-sky.jpg', value: '2,960 km' }, answer: 0, fact: 'The B-2 is a global-range bomber; the Raptor is a tactical fighter.' },
  { id: 'qc12', mode: 'comparison', difficulty: 'hard', prompt: 'Which aircraft flies higher (service ceiling)?', left: { name: 'SR-71 Blackbird', image: 'images/sr71.jpg', value: '25,900 m' }, right: { name: 'Concorde', image: 'images/concorde.jpg', value: '18,300 m' }, answer: 0, fact: 'The Blackbird routinely worked above 25 km — near the edge of space.' },
  { id: 'qc13', mode: 'comparison', difficulty: 'easy', prompt: 'Which airliner carries more passengers typically?', left: { name: 'Airbus A350-900', image: 'images/a350.jpg', value: '~315 in 3 classes' }, right: { name: 'Cessna 172', image: 'images/cessna.jpg', value: '3 passengers' }, answer: 0, fact: 'The Skyhawk wins on charm, the A350 on seats.' },
  { id: 'qc14', mode: 'comparison', difficulty: 'medium', prompt: 'Which aircraft has the larger wingspan?', left: { name: 'CH-47 Chinook', image: 'images/chinook.jpg', value: '18.3 m rotor diameter' }, right: { name: 'Eurofighter Typhoon', image: 'images/typhoon.jpg', value: '11.0 m' }, answer: 0, fact: 'Tandem rotors span wider than most fighter wings.' },
]

export const seasonalChallenges: SeasonalChallenge[] = [
  { id: 'sc1', title: 'Autumn Photo Sprint', description: 'Share 5 posts with photographs this season.', target: 5, metric: 'posts', rewardXp: 200 },
  { id: 'sc2', title: 'Quiz Voyager', description: 'Complete 10 activity rounds this season.', target: 10, metric: 'quizzes', rewardXp: 150 },
  { id: 'sc3', title: 'Conversation Captain', description: 'Write 15 comments across the feed.', target: 15, metric: 'comments', rewardXp: 120 },
  { id: 'sc4', title: 'Climb 1,000 XP', description: 'Earn 1,000 XP in any legitimate way.', target: 1000, metric: 'xp', rewardXp: 100 },
]

export const demoLeaderboards: Record<string, GlobalLeaderRow[]> = {
  global: [
    { userId: 'u_maya', score: 12840 },
    { userId: 'u_james', score: 11220 },
    { userId: 'u_yuki', score: 10480 },
    { userId: 'u_alex', score: 9870 },
    { userId: 'u_diego', score: 9340 },
    { userId: 'u_lukas', score: 8610 },
    { userId: 'u_sophie', score: 7920 },
    { userId: 'u_ingrid', score: 7110 },
    { userId: 'u_priya', score: 6350 },
  ],
  weekly: [
    { userId: 'u_yuki', score: 1240 },
    { userId: 'u_alex', score: 1185 },
    { userId: 'u_diego', score: 1090 },
    { userId: 'u_lukas', score: 980 },
    { userId: 'u_maya', score: 940 },
    { userId: 'u_ingrid', score: 870 },
    { userId: 'u_james', score: 810 },
    { userId: 'u_sophie', score: 760 },
    { userId: 'u_priya', score: 640 },
  ],
  monthly: [
    { userId: 'u_maya', score: 4620 },
    { userId: 'u_james', score: 4210 },
    { userId: 'u_alex', score: 3980 },
    { userId: 'u_yuki', score: 3870 },
    { userId: 'u_diego', score: 3510 },
    { userId: 'u_lukas', score: 3120 },
    { userId: 'u_sophie', score: 2890 },
    { userId: 'u_priya', score: 2310 },
    { userId: 'u_ingrid', score: 2180 },
  ],
}
