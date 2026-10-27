const fs = require('fs');
let code = fs.readFileSync('frontend/static/js/workouts.js', 'utf8');

// Extract the functions
const m1 = code.match(/export function getTrainerImageForExercise[\s\S]*?^}/m);
const m2 = code.match(/export function getTrainerVideoForExercise[\s\S]*?^}/m);
const m3 = code.match(/function getTrainerAssetBase[\s\S]*?^}/m);

eval(m1[0].replace('export ', ''));
eval(m2[0].replace('export ', ''));
eval(m3[0]);

const tests = [
  // Yoga Flow
  { w: 'Yoga Flow', cat: 'Flexibility', ex: 'Cat-Cow Spinal Articulation' },
  { w: 'Yoga Flow', cat: 'Flexibility', ex: 'Downward-Facing Dog to Plank Flow' },
  { w: 'Yoga Flow', cat: 'Flexibility', ex: 'Warrior II & Extended Side Angle Flow' },
  { w: 'Yoga Flow', cat: 'Flexibility', ex: 'Seated Forward Fold & Deep Release' },

  // Bedtime Deep Rest & Mobility Stretch
  { w: 'Bedtime Deep Rest & Mobility Stretch', cat: 'Flexibility', ex: 'Supine Gentle Spinal Twist' },
  { w: 'Bedtime Deep Rest & Mobility Stretch', cat: 'Flexibility', ex: 'Reclined Bound Angle Pose (Supta Baddha Konasana)' },
  { w: 'Bedtime Deep Rest & Mobility Stretch', cat: 'Flexibility', ex: 'Gentle Legs-Up-the-Wall Inversion' },
  { w: 'Bedtime Deep Rest & Mobility Stretch', cat: 'Flexibility', ex: "Extended Child's Pose with 4-7-8 Breathing" },

  // Wall Pilates Core & Posture
  { w: 'Wall Pilates Core & Posture', cat: 'Pilates & Core', ex: 'Wall Roll-Down & Spinal Articulation' },
  { w: 'Wall Pilates Core & Posture', cat: 'Pilates & Core', ex: 'Wall Sit with Core Bracing & Arm Pulses' },
  { w: 'Wall Pilates Core & Posture', cat: 'Pilates & Core', ex: 'Wall Glute Bridge with Pelvic Tilt' },
  { w: 'Wall Pilates Core & Posture', cat: 'Pilates & Core', ex: 'Wall Angel Scapular Retractions' },

  // 10-Min Fast Calorie Torch HIIT
  { w: '10-Min Fast Calorie Torch HIIT', cat: 'HIIT', ex: 'Burpee into Mountain Climbers' },
  { w: '10-Min Fast Calorie Torch HIIT', cat: 'HIIT', ex: 'Squat Jump into Lateral Bounds' },
  { w: '10-Min Fast Calorie Torch HIIT', cat: 'HIIT', ex: 'Plank Jacks with Shoulder Taps' },
  { w: '10-Min Fast Calorie Torch HIIT', cat: 'HIIT', ex: 'Fast High Knees VO2 Max Finisher' }
];

console.log('--- VERIFYING EXACT JAVASCRIPT FUNCTIONS IN FRONTEND ---');
let allOk = true;
tests.forEach(t => {
  const vid = getTrainerVideoForExercise(t.ex, t.cat, t.w);
  const img = getTrainerImageForExercise(t.ex, t.cat, t.w);
  const vidExists = fs.existsSync('frontend/static/assets/trainer/' + vid);
  const imgExists = fs.existsSync('frontend/static/assets/trainer/' + img);
  if (!vidExists || !imgExists) allOk = false;
  console.log(t.w.padEnd(36) + ' | ' + t.ex.padEnd(46) + ' -> ' + vid.padEnd(22) + ' (Video: ' + vidExists + ', Poster: ' + imgExists + ')');
});

console.log('\nStatus:', allOk ? 'ALL PASS! 100% MATCHED AND AVAILABLE' : 'SOME MISSING');
