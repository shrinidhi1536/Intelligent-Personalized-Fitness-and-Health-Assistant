import json
import pymysql
from backend.db import get_connection

FOOD_ITEMS = [
    # South Indian
    ("Idli", "2 pcs (100g)", 78.0, 2.4, 16.0, 0.4, "South Indian"),
    ("Plain Dosa", "1 medium (80g)", 133.0, 2.7, 19.0, 4.7, "South Indian"),
    ("Masala Dosa", "1 medium (130g)", 210.0, 4.0, 30.0, 8.5, "South Indian"),
    ("Oats Idli", "2 pcs (100g)", 95.0, 4.2, 17.0, 1.2, "South Indian"),
    ("Ragi Dosa", "1 medium (80g)", 125.0, 3.2, 22.0, 2.5, "South Indian"),
    ("Pesarattu (Moong Dal Dosa)", "1 medium (90g)", 140.0, 7.5, 20.0, 3.2, "South Indian"),
    ("Sambar", "1 bowl (150g)", 120.0, 6.0, 18.0, 3.0, "South Indian"),
    ("Coconut Chutney", "2 tbsp (30g)", 65.0, 0.8, 2.0, 6.2, "South Indian"),
    ("Tomato Onion Chutney", "2 tbsp (30g)", 35.0, 0.7, 4.5, 1.5, "South Indian"),
    ("Rava Upma with Veggies", "1 bowl (150g)", 180.0, 4.5, 28.0, 5.5, "South Indian"),
    ("Ven Pongal", "1 bowl (150g)", 215.0, 5.8, 32.0, 7.5, "South Indian"),
    ("Appam", "2 pcs (100g)", 120.0, 2.0, 24.0, 1.8, "South Indian"),
    ("Vegetable Stew / Kurma", "1 bowl (150g)", 145.0, 3.8, 14.0, 8.2, "South Indian"),
    ("Curd Rice (Tempered)", "1 bowl (180g)", 210.0, 5.2, 34.0, 5.8, "South Indian"),
    ("Lemon Rice with Peanuts", "1 bowl (160g)", 230.0, 4.8, 38.0, 6.5, "South Indian"),
    ("Tomato Rasam", "1 cup (150ml)", 45.0, 1.5, 7.0, 1.0, "South Indian"),
    ("Bisi Bele Bath", "1 bowl (180g)", 240.0, 6.5, 38.0, 6.8, "South Indian"),
    ("Vegetable Uttapam", "1 pc (110g)", 165.0, 4.0, 26.0, 4.8, "South Indian"),
    ("Steamed Sprouted Sundal", "1 bowl (100g)", 130.0, 7.2, 20.0, 2.2, "South Indian"),
    ("Cabbage Thoran / Poriyal", "1 cup (120g)", 80.0, 2.5, 9.0, 3.8, "South Indian"),

    # North Indian
    ("Whole Wheat Roti / Phulka", "1 pc (35g)", 85.0, 3.0, 17.0, 0.5, "North Indian"),
    ("Plain Paratha (Light Ghee)", "1 pc (60g)", 160.0, 3.8, 24.0, 5.5, "North Indian"),
    ("Methi Paratha", "1 pc (60g)", 145.0, 4.2, 22.0, 4.5, "North Indian"),
    ("Paneer Paratha (Low Oil)", "1 pc (85g)", 210.0, 9.5, 25.0, 7.8, "North Indian"),
    ("Dal Tadka (Yellow Lentil)", "1 bowl (150g)", 140.0, 7.8, 19.0, 4.0, "North Indian"),
    ("Dal Makhani (Light Cream)", "1 bowl (150g)", 220.0, 9.0, 22.0, 10.5, "North Indian"),
    ("Rajma Masala (Kidney Beans)", "1 bowl (150g)", 185.0, 8.5, 27.0, 4.2, "North Indian"),
    ("Chana Masala (Chole)", "1 bowl (150g)", 195.0, 9.2, 28.0, 5.0, "North Indian"),
    ("Paneer Bhurji", "1 bowl (120g)", 220.0, 14.5, 5.0, 15.5, "North Indian"),
    ("Palak Paneer", "1 bowl (160g)", 210.0, 11.5, 8.0, 14.8, "North Indian"),
    ("Matar Paneer", "1 bowl (160g)", 225.0, 10.8, 14.0, 13.5, "North Indian"),
    ("Aloo Gobi Sabzi", "1 bowl (140g)", 135.0, 3.2, 18.0, 5.8, "North Indian"),
    ("Baingan Bharta (Roasted Eggplant)", "1 bowl (140g)", 110.0, 2.5, 12.0, 5.5, "North Indian"),
    ("Bhindi Masala (Okra)", "1 bowl (130g)", 105.0, 2.2, 11.0, 5.8, "North Indian"),
    ("Kadhi Pakora (Gram Flour Stew)", "1 bowl (160g)", 175.0, 6.0, 16.0, 9.5, "North Indian"),
    ("Jeera Rice", "1 bowl (150g)", 195.0, 3.8, 38.0, 3.2, "North Indian"),
    ("Vegetable Pulao", "1 bowl (170g)", 215.0, 4.5, 39.0, 4.5, "North Indian"),
    ("Tandoori Roti", "1 pc (40g)", 110.0, 3.6, 22.0, 0.6, "North Indian"),

    # Lean Proteins - Veg & Vegan
    ("Low-Fat Paneer", "100g", 160.0, 19.0, 3.5, 7.5, "Vegetarian Protein"),
    ("Standard Paneer", "100g", 265.0, 18.3, 3.0, 20.8, "Vegetarian Protein"),
    ("Firm Tofu", "100g", 83.0, 10.0, 2.0, 4.8, "Vegan Protein"),
    ("Soya Chunks (Dry boiled)", "50g dry (yields 150g)", 172.0, 26.0, 16.5, 0.5, "Vegan Protein"),
    ("Tempeh (Cooked)", "100g", 192.0, 20.3, 7.6, 10.8, "Vegan Protein"),
    ("Sprouted Green Moong", "1 cup (100g)", 105.0, 7.0, 19.0, 0.4, "Vegan Protein"),
    ("Boiled Chickpeas (Kabuli Chana)", "1 cup (150g)", 240.0, 12.5, 40.0, 3.8, "Vegan Protein"),
    ("Black Chana (Boiled)", "1 cup (150g)", 210.0, 13.0, 35.0, 2.5, "Vegan Protein"),
    ("Green Gram Dal (Moong)", "1 bowl cooked (150g)", 148.0, 10.5, 23.0, 1.2, "Vegan Protein"),
    ("Masoor Dal (Red Lentil)", "1 bowl cooked (150g)", 160.0, 11.0, 25.0, 1.5, "Vegan Protein"),
    ("Greek Yogurt (Plain Low-Fat)", "1 cup (170g)", 100.0, 17.0, 6.0, 0.7, "Vegetarian Protein"),
    ("Low-Fat Curd / Dahi", "1 cup (150g)", 90.0, 6.5, 8.0, 3.5, "Vegetarian Protein"),
    ("Edamame (Steamed pods)", "1 cup (150g)", 188.0, 18.4, 13.8, 8.0, "Vegan Protein"),

    # Lean Proteins - Egg & Non-Veg
    ("Boiled Egg (Whole)", "1 large (50g)", 74.0, 6.3, 0.4, 5.0, "Eggs & Poultry"),
    ("Boiled Egg White", "2 egg whites (66g)", 34.0, 7.2, 0.5, 0.2, "Eggs & Poultry"),
    ("Egg Omelette with Veggies", "2 eggs + veggies", 168.0, 13.5, 3.0, 11.2, "Eggs & Poultry"),
    ("Scrambled Eggs (Olive Oil)", "2 eggs", 160.0, 12.8, 1.5, 11.5, "Eggs & Poultry"),
    ("Grilled Chicken Breast", "100g cooked", 165.0, 31.0, 0.0, 3.6, "Eggs & Poultry"),
    ("Tandoori Chicken Breast", "150g", 210.0, 34.0, 3.0, 6.5, "Eggs & Poultry"),
    ("Chicken Tikka (Dry Grilled)", "100g", 155.0, 24.0, 2.5, 5.0, "Eggs & Poultry"),
    ("Home-style Chicken Curry", "1 bowl (180g)", 240.0, 26.0, 6.0, 12.0, "Eggs & Poultry"),
    ("Boiled Shredded Chicken", "100g", 150.0, 30.0, 0.0, 2.8, "Eggs & Poultry"),
    ("Salmon Fillet (Grilled)", "100g", 206.0, 22.0, 0.0, 12.3, "Seafood"),
    ("Rohu / Katla Fish Curry", "1 piece + gravy (150g)", 180.0, 20.0, 4.0, 9.0, "Seafood"),
    ("Grilled Pomfret", "100g", 145.0, 19.5, 0.0, 7.0, "Seafood"),
    ("Tuna in Brine (Drained)", "1 can (120g)", 132.0, 29.0, 0.0, 1.2, "Seafood"),
    ("Prawns Masala (Low Oil)", "100g prawns", 130.0, 21.0, 3.5, 3.2, "Seafood"),

    # Grains, Cereals & Tubers
    ("Rolled Oats (Cooked in water)", "1 bowl (40g dry)", 150.0, 5.0, 27.0, 2.8, "Grains"),
    ("Steel Cut Oats", "1 bowl (40g dry)", 152.0, 5.5, 26.5, 2.5, "Grains"),
    ("Cooked Quinoa", "1 cup (185g)", 222.0, 8.1, 39.4, 3.6, "Grains"),
    ("Brown Rice (Cooked)", "1 cup (150g)", 165.0, 3.5, 35.0, 1.3, "Grains"),
    ("White Basmati Rice (Cooked)", "1 cup (150g)", 195.0, 4.1, 43.0, 0.4, "Grains"),
    ("Foxtail Millet (Cooked)", "1 cup (150g)", 175.0, 5.2, 36.0, 1.5, "Grains"),
    ("Ragi Flour / Porridge", "1 bowl (40g dry)", 140.0, 3.2, 30.0, 0.8, "Grains"),
    ("Whole Wheat Bread", "2 slices (60g)", 150.0, 6.0, 28.0, 1.8, "Grains"),
    ("Multigrain Bread", "2 slices (60g)", 160.0, 7.5, 27.0, 2.2, "Grains"),
    ("Sweet Potato (Boiled/Steamed)", "1 medium (130g)", 112.0, 2.0, 26.0, 0.1, "Tubers"),
    ("Boiled Baby Potatoes", "100g", 87.0, 1.9, 20.0, 0.1, "Tubers"),
    ("Sweet Corn (Steamed)", "1 cob / 100g kernels", 96.0, 3.4, 21.0, 1.5, "Grains"),

    # Fresh Fruits
    ("Banana", "1 medium (118g)", 105.0, 1.3, 27.0, 0.3, "Fruits"),
    ("Apple", "1 medium (180g)", 95.0, 0.5, 25.0, 0.3, "Fruits"),
    ("Orange", "1 medium (130g)", 62.0, 1.2, 15.4, 0.2, "Fruits"),
    ("Papaya Cubes", "1 cup (145g)", 62.0, 0.7, 15.0, 0.4, "Fruits"),
    ("Guava (Amrood)", "1 medium (100g)", 68.0, 2.6, 14.3, 0.9, "Fruits"),
    ("Watermelon Cubes", "1 large bowl (250g)", 75.0, 1.5, 19.0, 0.4, "Fruits"),
    ("Pomegranate Arils", "1/2 cup (87g)", 72.0, 1.5, 16.3, 1.0, "Fruits"),
    ("Blueberries", "1/2 cup (75g)", 42.0, 0.5, 10.7, 0.2, "Fruits"),
    ("Strawberries", "1 cup (150g)", 48.0, 1.0, 11.5, 0.4, "Fruits"),
    ("Kiwi", "1 fruit (69g)", 42.0, 0.8, 10.0, 0.4, "Fruits"),
    ("Pineapple Slices", "1 cup (165g)", 82.0, 0.9, 21.6, 0.2, "Fruits"),
    ("Muskmelon / Cantaloupe", "1 cup (160g)", 54.0, 1.3, 13.0, 0.3, "Fruits"),

    # Raw Vegetables & Salads
    ("Cucumber Slices", "1 large (200g)", 30.0, 1.4, 7.2, 0.2, "Vegetables"),
    ("Tomato Slices", "1 medium (120g)", 22.0, 1.1, 4.8, 0.2, "Vegetables"),
    ("Carrot Sticks", "1 medium (70g)", 29.0, 0.7, 6.7, 0.2, "Vegetables"),
    ("Steamed Broccoli", "1 cup (90g)", 31.0, 2.6, 6.0, 0.3, "Vegetables"),
    ("Sauteed Spinach", "1 cup cooked (180g)", 41.0, 5.3, 6.7, 0.8, "Vegetables"),
    ("Boiled Beetroot", "1 medium (100g)", 43.0, 1.6, 9.6, 0.2, "Vegetables"),
    ("Green Beans Steamed", "1 cup (100g)", 35.0, 1.8, 7.8, 0.3, "Vegetables"),
    ("Bell Peppers (Capsicum)", "1 cup chopped (100g)", 26.0, 1.0, 6.0, 0.3, "Vegetables"),
    ("Sauteed Mushrooms", "1 cup (100g)", 28.0, 3.1, 4.3, 0.3, "Vegetables"),
    ("Mixed Green Salad with Lemon Dressing", "1 large bowl (150g)", 45.0, 2.0, 7.5, 1.0, "Vegetables"),

    # Nuts, Seeds & Healthy Fats
    ("Raw Almonds", "15 nuts (18g)", 105.0, 3.8, 3.9, 9.0, "Nuts & Seeds"),
    ("Walnuts", "6 halves (15g)", 98.0, 2.3, 2.0, 9.8, "Nuts & Seeds"),
    ("Cashews (Raw)", "12 nuts (15g)", 85.0, 2.7, 4.5, 6.8, "Nuts & Seeds"),
    ("Chia Seeds", "1 tbsp (12g)", 58.0, 2.0, 5.0, 3.7, "Nuts & Seeds"),
    ("Flaxseeds (Ground)", "1 tbsp (10g)", 55.0, 1.9, 3.0, 4.2, "Nuts & Seeds"),
    ("Pumpkin Seeds", "1 tbsp (15g)", 85.0, 4.5, 2.2, 7.2, "Nuts & Seeds"),
    ("Peanut Butter (Natural, No Sugar)", "1 tbsp (16g)", 95.0, 4.0, 3.2, 8.0, "Nuts & Seeds"),
    ("Extra Virgin Olive Oil", "1 tsp (5ml)", 40.0, 0.0, 0.0, 4.5, "Healthy Oils"),
    ("Desi Cow Ghee (Pure)", "1 tsp (5ml)", 45.0, 0.0, 0.0, 5.0, "Healthy Oils"),

    # Healthy Snacks & Beverages
    ("Roasted Makhana (Foxnuts)", "1 bowl (30g)", 105.0, 2.9, 21.0, 0.5, "Healthy Snacks"),
    ("Roasted Bengal Gram (Chana)", "1 small bowl (30g)", 110.0, 6.0, 17.5, 1.6, "Healthy Snacks"),
    ("Boiled Peanut Sundal", "1 small cup (50g)", 125.0, 5.5, 8.0, 8.5, "Healthy Snacks"),
    ("Sprouts Chaat with Lime & Onion", "1 bowl (120g)", 120.0, 8.0, 20.0, 1.2, "Healthy Snacks"),
    ("Hummus with Cucumber Sticks", "2 tbsp hummus + cucumber", 80.0, 2.8, 8.0, 4.2, "Healthy Snacks"),
    ("Fresh Tender Coconut Water", "1 glass (240ml)", 46.0, 1.7, 8.9, 0.5, "Healthy Beverages"),
    ("Spiced Buttermilk (Chaas)", "1 glass (200ml)", 40.0, 3.2, 4.0, 1.2, "Healthy Beverages"),
    ("Green Tea (Unsweetened)", "1 cup (200ml)", 2.0, 0.2, 0.4, 0.0, "Healthy Beverages"),
    ("Black Coffee (Unsweetened)", "1 cup (200ml)", 2.0, 0.3, 0.0, 0.0, "Healthy Beverages"),
    ("Golden Turmeric Milk (Skim)", "1 cup (200ml)", 90.0, 7.0, 10.0, 2.0, "Healthy Beverages"),
    ("Whey Protein in Water", "1 scoop (30g)", 120.0, 24.0, 2.0, 1.5, "Healthy Beverages"),
]

WORKOUTS_LIST = [
    {
        "name": "Wall Pilates Core & Posture",
        "category": "Pilates & Core",
        "difficulty": "Beginner",
        "duration_min": 15,
        "cal_per_minute": 5.5,
        "target_muscles": "Core, Lower Back, Glutes, Postural Chains",
        "equipment_needed": "Wall, Mat",
        "video_id": "kXU54m2t73E",
        "description": "Gentle low-impact wall pilates workout focusing on deep transverse abdominis engagement and spinal decompression.",
        "exercise_steps": [
            {"name": "Wall Bridge Hip Elevations", "sets": 3, "reps": "12 reps", "rest_sec": 30, "cues": "Feet pressed flat against the wall at 90 degrees, squeeze glutes at top."},
            {"name": "Wall Plank Mountain Drives", "sets": 3, "reps": "16 reps", "rest_sec": 30, "cues": "Hands on wall at chest level, drive alternating knees slowly with tight core."},
            {"name": "Wall Sit Arm Overhead Pulses", "sets": 3, "reps": "30 sec", "rest_sec": 45, "cues": "Thighs parallel to floor, press back flat against wall, pulse arms overhead."},
            {"name": "Wall Roll-Down Spinal Stretch", "sets": 2, "reps": "5 slow reps", "rest_sec": 30, "cues": "Inhale deeply, roll down vertebra by vertebra, release neck tension."}
        ]
    },
    {
        "name": "10-Min Fast Calorie Torch HIIT",
        "category": "HIIT",
        "difficulty": "Intermediate",
        "duration_min": 10,
        "cal_per_minute": 10.5,
        "target_muscles": "Full Body, Cardiovascular System",
        "equipment_needed": "No Equipment",
        "video_id": "gC_L9qAHVJ8",
        "description": "High-octane interval training alternating 30 seconds of explosive movement with 15 seconds of active recovery to elevate EPOC.",
        "exercise_steps": [
            {"name": "High Knee Sprints in Place", "sets": 4, "reps": "30 sec", "rest_sec": 15, "cues": "Drive knees to waist height, pump arms rhythmically."},
            {"name": "Explosive Star Jumps", "sets": 4, "reps": "30 sec", "rest_sec": 15, "cues": "Sink low into squat, explode outward into star position, soft landing."},
            {"name": "Bodyweight Sprawls", "sets": 4, "reps": "30 sec", "rest_sec": 15, "cues": "Hands to mat, kick feet back, return to standing tall, high tempo."},
            {"name": "Skaters with Lateral Touch", "sets": 4, "reps": "30 sec", "rest_sec": 15, "cues": "Leap side to side, touch trailing hand to opposite ankle."}
        ]
    },
    {
        "name": "Dumbbell Full Body Hypertrophy",
        "category": "Strength",
        "difficulty": "Intermediate",
        "duration_min": 30,
        "cal_per_minute": 7.5,
        "target_muscles": "Chest, Quads, Hamstrings, Back, Shoulders",
        "equipment_needed": "Dumbbells, Mat",
        "video_id": "YdB1HMCldJY",
        "description": "Compound dumbbell supersets engineered for metabolic resistance and progressive overload.",
        "exercise_steps": [
            {"name": "Goblet Squats", "sets": 4, "reps": "12 reps", "rest_sec": 45, "cues": "Hold dumbbell vertically at chest, break at hips, push knees out."},
            {"name": "Dumbbell Floor Chest Press", "sets": 4, "reps": "10 reps", "rest_sec": 45, "cues": "Keep elbows at 45 degrees, press dumbbells overhead, squeeze pecs."},
            {"name": "Bent-Over Dumbbell Rows", "sets": 4, "reps": "12 reps", "rest_sec": 45, "cues": "Hinge at hips, flat spine, pull dumbbells toward hip pockets."},
            {"name": "Dumbbell Roman Deadlifts", "sets": 3, "reps": "12 reps", "rest_sec": 45, "cues": "Soft knee bend, push hips backward, feel stretch along hamstrings."}
        ]
    },
    {
        "name": "Somatic Reset & Nervous System De-stress",
        "category": "Mobility",
        "difficulty": "Beginner",
        "duration_min": 12,
        "cal_per_minute": 3.8,
        "target_muscles": "Psoas, Diaphragm, Hips, Cervical Spine",
        "equipment_needed": "Mat",
        "video_id": "0j5P0o6bLpI",
        "description": "Slow, mindful somatic pandiculations to downregulate the sympathetic nervous system and release chronic muscle holding patterns.",
        "exercise_steps": [
            {"name": "Diaphragmatic Box Breathing", "sets": 1, "reps": "3 min", "rest_sec": 0, "cues": "Inhale 4s, hold 4s, exhale 4s, hold 4s into belly."},
            {"name": "Pelvic Rocking Arch & Flatten", "sets": 3, "reps": "10 slow cycles", "rest_sec": 20, "cues": "Synchronize breath with gentle pelvic tilt on the mat."},
            {"name": "Cat-Cow Spine Wave", "sets": 3, "reps": "8 slow waves", "rest_sec": 20, "cues": "Initiate movement from tailbone upward to base of skull."},
            {"name": "Supine Figure-4 Gentle Rock", "sets": 2, "reps": "1 min each side", "rest_sec": 30, "cues": "Ankle on opposite knee, rock gently side to side."}
        ]
    },
    {
        "name": "Glute & Leg Sculpt Blast",
        "category": "Strength",
        "difficulty": "Intermediate",
        "duration_min": 20,
        "cal_per_minute": 7.0,
        "target_muscles": "Gluteus Maximus, Glute Medius, Quads, Hamstrings",
        "equipment_needed": "Resistance Bands, Mat",
        "video_id": "qX3eB1lP3sQ",
        "description": "Targeted lower body conditioning to activate glutes, shape thighs, and build explosive hip drive.",
        "exercise_steps": [
            {"name": "Banded Glute Bridges", "sets": 4, "reps": "15 reps", "rest_sec": 30, "cues": "Band above knees, abduct slightly, drive through heels."},
            {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10 reps/leg", "rest_sec": 45, "cues": "Back foot on couch/chair, drop back knee toward floor, torso upright."},
            {"name": "Banded Lateral Clamshells", "sets": 3, "reps": "15 reps/side", "rest_sec": 30, "cues": "Keep heels touching, open top knee without rolling hips back."},
            {"name": "Walking Lunges", "sets": 3, "reps": "20 steps", "rest_sec": 45, "cues": "90 degree angles on both knees, controlled descent."}
        ]
    },
    {
        "name": "Bedtime Deep Rest & Mobility Stretch",
        "category": "Flexibility",
        "difficulty": "Beginner",
        "duration_min": 10,
        "cal_per_minute": 3.0,
        "target_muscles": "Hamstrings, Hip Flexors, Thoracic Spine",
        "equipment_needed": "Mat, Pillow",
        "video_id": "VaoV1PrYft4",
        "description": "Relaxing stretches to prepare the body for deep REM and restorative slow-wave sleep.",
        "exercise_steps": [
            {"name": "Child's Pose with Side Reach", "sets": 2, "reps": "60 sec/side", "rest_sec": 15, "cues": "Hips back to heels, walk hands diagonally across mat."},
            {"name": "Lizard Hip Opener", "sets": 2, "reps": "45 sec/side", "rest_sec": 15, "cues": "Step foot outside hand, sink hips down gently."},
            {"name": "Legs-Up-The-Wall Restoration", "sets": 1, "reps": "4 min", "rest_sec": 0, "cues": "Elevate hips on cushion, let blood drain from legs, close eyes."}
        ]
    },
    {
        "name": "Desk Worker Posture & Neck Relief",
        "category": "Mobility",
        "difficulty": "Beginner",
        "duration_min": 8,
        "cal_per_minute": 3.5,
        "target_muscles": "Trapezius, Rhomboids, Chest, Cervical Spine",
        "equipment_needed": "No Equipment",
        "video_id": "2KGY5Qz0t0Q",
        "description": "Quick midday routine to counteract hunching, rounded shoulders, and anterior head posture from desk work.",
        "exercise_steps": [
            {"name": "Chin Tucks & Neck Glides", "sets": 3, "reps": "10 reps", "rest_sec": 20, "cues": "Draw chin straight back, make double chin, hold 2s."},
            {"name": "Doorway Pec Stretch", "sets": 3, "reps": "30 sec/side", "rest_sec": 20, "cues": "Forearm on door jamb at 90 degrees, step forward gently."},
            {"name": "Y-T-W Scapular Retractions", "sets": 3, "reps": "8 reps each letter", "rest_sec": 30, "cues": "Pinch shoulder blades down and back, engage rhomboids."}
        ]
    },
    {
        "name": "Cardio Walking Fat Melt",
        "category": "Cardio",
        "difficulty": "Beginner",
        "duration_min": 25,
        "cal_per_minute": 6.0,
        "target_muscles": "Calves, Quads, Aerobic Heart Zone",
        "equipment_needed": "No Equipment",
        "video_id": "enYITYwvPAQ",
        "description": "Brisk power walking intervals with rhythmic arm drives designed for sustainable fat oxidation without joint strain.",
        "exercise_steps": [
            {"name": "Brisk Power March with Arm Swings", "sets": 1, "reps": "5 min", "rest_sec": 0, "cues": "Steady pace, roll heel-to-toe, engage core."},
            {"name": "Wide Stance Heel Taps with Overhead Reach", "sets": 4, "reps": "45 sec", "rest_sec": 15, "cues": "Tap heel forward, extend arms overhead rhythmically."},
            {"name": "Side-to-Side Step Touches with Chest Opens", "sets": 4, "reps": "45 sec", "rest_sec": 15, "cues": "Wide steps, open arms wide to expand chest."},
            {"name": "Gentle Cool Down Walk & Deep Breath", "sets": 1, "reps": "3 min", "rest_sec": 0, "cues": "Lower heart rate progressively, slow deep inhales."}
        ]
    },
    {
        "name": "Morning Sun Salutation Yoga Flow",
        "category": "Yoga",
        "difficulty": "Beginner",
        "duration_min": 15,
        "cal_per_minute": 4.5,
        "target_muscles": "Full Body, Spine, Shoulders, Hamstrings",
        "equipment_needed": "Mat",
        "video_id": "V4O49tXFwU8",
        "description": "Vinyasa Surya Namaskar sequence that activates circulation, lubricates spinal joints, and boosts morning alertness.",
        "exercise_steps": [
            {"name": "Mountain Pose & Upward Salute", "sets": 4, "reps": "Breath synchronized", "rest_sec": 10, "cues": "Ground feet, lengthen spine, reach arms to sky."},
            {"name": "Forward Fold to Halfway Lift", "sets": 4, "reps": "Breath synchronized", "rest_sec": 10, "cues": "Hinge at hips, flat back on inhale, fold on exhale."},
            {"name": "Plank to Cobra Flow", "sets": 4, "reps": "Breath synchronized", "rest_sec": 10, "cues": "Lower with elbows in, open chest gently into bhujangasana."},
            {"name": "Downward Facing Dog Pedal", "sets": 4, "reps": "5 breaths", "rest_sec": 15, "cues": "Push chest toward thighs, alternate pedaling heels."}
        ]
    },
    {
        "name": "Advanced Calisthenics Upper Body Shred",
        "category": "Strength",
        "difficulty": "Advanced",
        "duration_min": 35,
        "cal_per_minute": 8.5,
        "target_muscles": "Triceps, Chest, Lats, Anterior Deltoids",
        "equipment_needed": "Mat, Pull-Up Bar / Sturdy Chair",
        "video_id": "8U8vA1gI348",
        "description": "High-intensity bodyweight strength circuit leveraging biomechanical leverage for maximal upper body density.",
        "exercise_steps": [
            {"name": "Archer Push-Ups", "sets": 4, "reps": "8 reps/side", "rest_sec": 60, "cues": "Wide stance, shift weight to one arm, extend opposite straight."},
            {"name": "Pike Push-Ups for Deltoids", "sets": 4, "reps": "10 reps", "rest_sec": 45, "cues": "Hips high in inverted V, lower head between hands."},
            {"name": "Bodyweight Chair Dips", "sets": 4, "reps": "15 reps", "rest_sec": 45, "cues": "Keep back close to chair edge, lower to 90 degrees at elbows."},
            {"name": "Diamond Push-Ups", "sets": 3, "reps": "12 reps", "rest_sec": 45, "cues": "Index fingers and thumbs touching, focus on tricep lock."}
        ]
    }
]

def seed_database():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # 1. Seed Food Database
            print("[INFO] Seeding food database...")
            cur.execute("SELECT name FROM food_database;")
            existing_foods = {row["name"].lower() for row in cur.fetchall()}

            inserted_foods = 0
            for name, serving, cal, prot, carbs, fat, cat in FOOD_ITEMS:
                if name.lower() not in existing_foods:
                    cur.execute("""
                        INSERT INTO food_database (name, serving, calories, protein_g, carbs_g, fat_g, category)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (name, serving, cal, prot, carbs, fat, cat))
                    existing_foods.add(name.lower())
                    inserted_foods += 1
            print(f"[OK] Added {inserted_foods} new foods. Total database contains {len(existing_foods)} items.")

            # 2. Seed Workouts
            print("[INFO] Seeding workouts...")
            cur.execute("SELECT name FROM workouts;")
            existing_workouts = {row["name"].lower() for row in cur.fetchall()}

            inserted_workouts = 0
            for w in WORKOUTS_LIST:
                name = w["name"]
                if name.lower() not in existing_workouts:
                    steps_json = json.dumps(w["exercise_steps"])
                    cur.execute("""
                        INSERT INTO workouts (name, category, default_sets, default_reps, cal_per_minute,
                                              description, difficulty, duration_min, target_muscles, equipment_needed,
                                              video_id, exercise_steps_json)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        name, w["category"], 3, "12 reps", w["cal_per_minute"],
                        w["description"], w["difficulty"], w["duration_min"],
                        w["target_muscles"], w["equipment_needed"], w["video_id"], steps_json
                    ))
                    existing_workouts.add(name.lower())
                    inserted_workouts += 1
                else:
                    # Update metadata on existing workout if missing
                    steps_json = json.dumps(w["exercise_steps"])
                    cur.execute("""
                        UPDATE workouts SET 
                            description=%s, difficulty=%s, duration_min=%s, target_muscles=%s,
                            equipment_needed=%s, video_id=%s, exercise_steps_json=%s
                        WHERE LOWER(name)=%s AND (exercise_steps_json IS NULL OR video_id = '')
                    """, (
                        w["description"], w["difficulty"], w["duration_min"],
                        w["target_muscles"], w["equipment_needed"], w["video_id"], steps_json,
                        name.lower()
                    ))

            print(f"[OK] Seeded {inserted_workouts} new workouts. Workout catalog contains {len(existing_workouts)} routines.")
            print("[SUCCESS] All database extensions and data seeding completed cleanly.")
    finally:
        conn.close()

if __name__ == "__main__":
    seed_database()
