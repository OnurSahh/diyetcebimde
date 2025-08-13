# mealplan/linear_optimizer.py

import pandas as pd

def solve_meal_plan_with_pulp(df_one_day, kcal_target, prot_target, carb_target, fat_target,
                              kcal_tol=0.05, prot_tol=0.1, carb_tol=0.1, fat_tol=0.1):
    try:
        from pulp import LpProblem, LpMinimize, LpVariable, lpSum, LpStatus, value, LpInteger
    except ImportError:
        print("[solve_meal_plan_with_pulp] pulp not installed!")
        return df_one_day, False

    print("[solve_meal_plan_with_pulp] => day name =>",
          df_one_day['day_index'].iloc[0] if not df_one_day.empty else "Unknown day")

    prob = LpProblem("MealPlanOptimize", LpMinimize)

    day_df = df_one_day.copy().reset_index(drop=True)
    y_vars = {}
    for i, row in day_df.iterrows():
        mp = row['minimum_porsiyon_boyutu']
        st = row['porsiyon_artıs_birimi']
        if st <= 0:
            st = 1.0
        maxp = row['maksimum_porsiyon_adedi']
        upbound = int(round((maxp - mp)/st))
        if upbound < 0:
            upbound = 0
        var = LpVariable(f"y_{i}", lowBound=0, upBound=upbound, cat=LpInteger)
        y_vars[i] = var

    def x_expr(i):
        r = day_df.loc[i]
        mp = r['minimum_porsiyon_boyutu']
        st = r['porsiyon_artıs_birimi']
        if st <= 0:
            st = 1.0
        return mp + st*y_vars[i]

    total_kcal = lpSum([x_expr(i)* day_df.loc[i,'kalori (kcal)'] for i in day_df.index])
    total_prot = lpSum([x_expr(i)* day_df.loc[i,'protein (g)'] for i in day_df.index])
    total_carb = lpSum([x_expr(i)* day_df.loc[i,'karbonhidrat (g)'] for i in day_df.index])
    total_fat  = lpSum([x_expr(i)* day_df.loc[i,'yag (g)'] for i in day_df.index])

    kcal_LB = kcal_target*(1.0 - kcal_tol)
    kcal_UB = kcal_target*(1.0 + kcal_tol)
    prot_LB = prot_target*(1.0 - prot_tol)
    prot_UB = prot_target*(1.0 + prot_tol)
    carb_LB = carb_target*(1.0 - carb_tol)
    carb_UB = carb_target*(1.0 + carb_tol)
    fat_LB  = fat_target*(1.0 - fat_tol)
    fat_UB  = fat_target*(1.0 + fat_tol)

    # Slack variables
    Splus_kcal   = LpVariable("Splus_kcal", lowBound=0)
    Sminus_kcal  = LpVariable("Sminus_kcal", lowBound=0)
    Splus_prot   = LpVariable("Splus_prot", lowBound=0)
    Sminus_prot  = LpVariable("Sminus_prot", lowBound=0)
    Splus_carb   = LpVariable("Splus_carb", lowBound=0)
    Sminus_carb  = LpVariable("Sminus_carb", lowBound=0)
    Splus_fat    = LpVariable("Splus_fat", lowBound=0)
    Sminus_fat   = LpVariable("Sminus_fat", lowBound=0)

    prob += (total_kcal >= kcal_LB - Sminus_kcal)
    prob += (total_kcal <= kcal_UB + Splus_kcal)
    prob += (total_prot >= prot_LB - Sminus_prot)
    prob += (total_prot <= prot_UB + Splus_prot)
    prob += (total_carb >= carb_LB - Sminus_carb)
    prob += (total_carb <= carb_UB + Splus_carb)
    prob += (total_fat  >= fat_LB  - Sminus_fat)
    prob += (total_fat  <= fat_UB  + Splus_fat)

    prob += (1.8*(Splus_kcal + Sminus_kcal)
             +1.5*(Splus_prot + Sminus_prot)
             +1.5*(Splus_carb + Sminus_carb)
             +1.5*(Splus_fat  + Sminus_fat))

    prob.solve()
    print("pulp => status:", LpStatus[prob.status])

    if LpStatus[prob.status] != "Optimal":
        return day_df, False

    for i in day_df.index:
        y_val = value(y_vars[i]) or 0
        mp = day_df.loc[i,'minimum_porsiyon_boyutu']
        st = day_df.loc[i,'porsiyon_artıs_birimi']
        if st <= 0:
            st = 1.0
        newp = mp + st*y_val
        newp = max(mp, newp)
        newp = min(day_df.loc[i,'maksimum_porsiyon_adedi'], newp)
        day_df.at[i,'porsiyon_adedi'] = newp

    return day_df, True
