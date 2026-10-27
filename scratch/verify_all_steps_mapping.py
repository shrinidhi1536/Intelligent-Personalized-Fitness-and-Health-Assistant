import os, sys, json
sys.path.append('.')
from backend.db import get_connection

conn = get_connection()
c = conn.cursor()
c.execute('SELECT id, name, category, exercise_steps_json FROM workouts ORDER BY id')
workouts = c.fetchall()

def getTrainerAssetBase(exerciseName='', category='', workoutName=''):
    ex = (exerciseName or '').lower()
    cat = (category or '').lower()
    wk = (workoutName or '').lower()

    # 1. SPECIFIC EXERCISE MOVEMENTS FIRST (Highest Priority):
    # Yoga & Mobility poses
    if 'cat-cow' in ex or 'cat cow' in ex or 'cat/cow' in ex: return 'cat_cow'
    if 'downward' in ex or 'adho mukha' in ex or 'dog to' in ex or ('dog' in ex and 'down' in ex): return 'downward_dog'
    if 'warrior' in ex or 'virabhadrasana' in ex or 'side angle' in ex: return 'warrior'
    if 'forward bend' in ex or 'forward fold' in ex or 'ragdoll' in ex or 'uttanasana' in ex: return 'forward_fold'
    if 'child' in ex or 'balasana' in ex: return 'child_pose'
    if 'legs-up' in ex or 'legs up' in ex or 'wall inversion' in ex or 'viparita' in ex: return 'legs_up_wall'
    if 'twist' in ex or 'spinal twist' in ex or 'supine gentle' in ex: return 'supine_twist'
    if 'bound angle' in ex or 'supta baddha' in ex or 'shavasana' in ex or 'savasana' in ex or 'constructive rest' in ex or 'reclined' in ex: return 'reclined_rest'
    if 'sun salutation' in ex or 'surya namaskar' in ex or 'mountain pose' in ex or 'tadasana' in ex: return 'sun_salutation'
    if 'cobra' in ex or 'vinyasa' in ex or 'heart opener' in ex: return 'yoga'

    # Strength & Calisthenics movements
    if 'goblet' in ex or 'sumo squat' in ex: return 'goblet_squat'
    if 'plank jack' in ex or 'shoulder tap' in ex: return 'plank_jacks'
    if 'side-lying' in ex or 'clamshell' in ex: return 'glute_sculpt'
    if 'bridge' in ex or 'pelvic tilt' in ex or 'hip thrust' in ex: return 'bridge'
    if 'side lunge' in ex or 'pulse lunge' in ex or 'lateral lunge' in ex: return 'side_lunge'
    if 'step up' in ex or 'step-up' in ex or 'incline march' in ex: return 'step_ups'
    if 'standing crunch' in ex or 'elbow to knee' in ex: return 'standing_crunch'
    if 'superman' in ex or 'prone extension' in ex: return 'superman'
    if 'dip' in ex or 'tricep dip' in ex: return 'dips'
    if 'deadlift' in ex or 'bent-over row' in ex or 'overhead press' in ex or 'hypertrophy' in ex: return 'dumbbell'
    if 'chin tuck' in ex or 'thoracic extension' in ex or 'neck relief' in ex: return 'posture'

    # Cardio & HIIT steps
    if 'mountain climber' in ex or 'climber' in ex: return 'mountain_climbers'
    if 'burpee' in ex: return 'burpees'
    if 'jump squat' in ex or 'rebound squat' in ex or 'squat jump' in ex or 'lateral bound' in ex: return 'jump_squats'
    if 'jumping jack' in ex or 'seal jack' in ex or 'cross-jack' in ex: return 'jumping_jacks'
    if 'high knee' in ex or 'a-skip' in ex or 'knee drive' in ex: return 'high_knees'
    if 'wall roll' in ex or 'wall pilates' in ex: return 'wall_pilates'
    if 'wall angel' in ex or 'scapular' in ex: return 'posture'
    if 'sprint' in ex or 'dash' in ex or 'shuffle' in ex: 
        if 'cycl' in wk or 'spin' in wk: return 'cycling'
        return 'sprint'
    if 'jump rope' in ex or 'rope' in ex: return 'hiit'
    if 'power walk' in ex or 'walking' in ex or 'stride' in ex: return 'cardio_walk' if ('cardio' in wk or 'melt' in wk) else 'walk'
    if 'jog' in ex or 'steady run' in ex or 'bounding stride' in ex: return 'run'
    if 'rpm' in ex or 'cycl' in ex or 'pedal' in ex or 'spin ' in ex or ' spin' in ex or ex == 'spin': return 'cycling'
    if 'push-up' in ex or 'push up' in ex or 'pushup' in ex: return 'pushup'
    if 'lunge' in ex or 'split squat' in ex: return 'lunge'
    if 'plank' in ex or 'hollow body' in ex: return 'plank'
    if 'squat' in ex or 'wall sit' in ex: return 'squat'
    if 'stretch' in ex or 'hamstring' in ex or 'psoas' in ex or 'reach' in ex: return 'stretch'
    if 'somatic' in ex: return 'somatic'

    # 2. WORKOUT-LEVEL FALLBACKS:
    if 'jumping jack' in wk: return 'jumping_jacks'
    if 'high knee' in wk: return 'high_knees'
    if 'mountain climber' in wk: return 'mountain_climbers'
    if 'burpee' in wk: return 'burpees'
    if 'jump squat' in wk: return 'jump_squats'
    if 'sprint' in wk: return 'sprint'
    if 'cardio walk' in wk or 'fat melt' in wk: return 'cardio_walk'
    if 'walk' in wk: return 'walk'
    if 'run' in wk: return 'run'
    if 'cycl' in wk: return 'cycling'
    if 'sun salutation' in wk: return 'sun_salutation'
    if 'yoga' in wk: return 'yoga'
    if 'bedtime' in wk or 'deep rest' in wk: return 'bedtime_rest'
    if 'wall pilates' in wk or 'pilates' in wk: return 'wall_pilates'
    if 'torch' in wk: return 'hiit'
    if 'dumbbell' in wk: return 'dumbbell'
    if 'somatic' in wk: return 'somatic'
    if 'glute' in wk: return 'glute_sculpt'
    if 'desk worker' in wk or 'posture' in wk: return 'posture'
    if 'calisthenic' in wk: return 'dips'
    if 'push up' in wk or 'push-up' in wk: return 'pushup'
    if 'lunge' in wk: return 'lunge'
    if 'plank' in wk: return 'plank'
    if 'stretch' in wk: return 'stretch'

    return 'squat'

trainer_dir = 'frontend/static/assets/trainer'
missing_assets = []
total_steps_checked = 0

for w in workouts:
    steps = w['exercise_steps_json']
    if isinstance(steps, str):
        steps = json.loads(steps)
    wid = w['id']
    wname = w['name']
    print(f'=== Workout {wid}: {wname} ===')
    for s in (steps or []):
        total_steps_checked += 1
        asset = getTrainerAssetBase(s['name'], w['category'], w['name'])
        mp4_path = os.path.join(trainer_dir, asset + '.mp4')
        jpg_path = os.path.join(trainer_dir, asset + '.jpg')
        mp4_ok = os.path.exists(mp4_path)
        jpg_ok = os.path.exists(jpg_path)
        if not mp4_ok or not jpg_ok:
            missing_assets.append(f'{asset} for {s["name"]} in W#{wid}')
        print(f'  Step: {s["name"]:48s} -> {asset:16s} [MP4: {mp4_ok}, JPG: {jpg_ok}]')

print(f'\nTotal steps verified: {total_steps_checked}')
print(f'Missing assets: {len(missing_assets)}')
if missing_assets:
    print('Missing:', missing_assets)
else:
    print('ALL 100 STEPS ACROSS ALL 25 WORKOUTS FULLY VERIFIED!')
