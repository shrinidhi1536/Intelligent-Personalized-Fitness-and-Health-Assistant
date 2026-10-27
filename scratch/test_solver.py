import sys
import numpy as np
from scipy.optimize import lsq_linear
sys.path.append('.')
from backend.db import fetch_all

# Let's test macro solver for User 2
# Profile 2: Cal 2304, P 98g, C 334g, F 64g
# Target per meal:
# Breakfast (25%): Cal 576, P 24.5g, C 83.5g, F 16.0g
# Lunch (35%): Cal 806.4, P 34.3g, C 116.9g, F 22.4g
# Dinner (25%): Cal 576, P 24.5g, C 83.5g, F 16.0g
# Snacks (15%): Cal 345.6, P 14.7g, C 50.1g, F 9.6g

# Sample Breakfast items for Eggetarian / South Indian:
# 1. Eggs / Paneer / Moong Dal: e.g. Boiled Eggs (2 eggs = 12g P, 1g C, 10g F, 140 cal)
# 2. Idli (2 pcs = 5g P, 32g C, 1g F, 156 cal)
# 3. Sambar / Chutney (1 bowl = 6g P, 18g C, 4g F, 130 cal)

b_target = np.array([24.5, 83.5, 16.0]) # [P, C, F]
# Matrix A: columns = [Boiled Eggs, Idli (2 pcs), Sambar]
A = np.array([
    [12.0, 5.0, 6.0],  # Protein
    [ 1.0, 32.0, 18.0], # Carbs
    [10.0,  1.0,  4.0]  # Fat
])

res = lsq_linear(A, b_target, bounds=(0.5, 3.0))
print("Breakfast scales (Eggs, Idli, Sambar):", res.x)
achieved = A @ res.x
print("Target:  ", b_target)
print("Achieved:", np.round(achieved, 1))
print("Target Cals:  ", 4*b_target[0] + 4*b_target[1] + 9*b_target[2])
print("Achieved Cals:", np.round(4*achieved[0] + 4*achieved[1] + 9*achieved[2], 1))
