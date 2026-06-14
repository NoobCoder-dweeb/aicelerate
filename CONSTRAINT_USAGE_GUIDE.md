# Constraint UI Usage Guide

## How to Add Lecturer Availability Constraints

1. **Navigate to Section 4** (Customization section) of the timetable generation form
2. **In "Lecturer Availability" section:**
   - Click the **"Lecturer"** dropdown and select a lecturer
   - Click the checkboxes for days they are **NOT available** (e.g., uncheck "Monday" if unavailable on Monday)
   - Click **"Add Lecturer Constraint"** button
   - The constraint should appear in the list below showing the lecturer name and unavailable days

3. **Repeat for additional lecturers** with different constraints

## How to Add Subject Schedule Constraints

1. **In "Subject Schedule Constraints" section:**
   - Click the **"Subject"** dropdown and select a subject
   - Click the checkboxes for days the subject **CANNOT be scheduled** on
   - Click **"Add Subject Constraint"** button
   - The constraint should appear in the list showing the subject name and restricted days

2. **Repeat for additional subjects** with different constraints

## Verification Steps

### Step 1: Check Browser Console

1. Open browser DevTools (F12 or Right-click → Inspect)
2. Go to **Console** tab
3. Generate the timetable
4. Look for: `Data being sent:` and verify it shows your constraints in the JSON

### Step 2: Check Server Logs

1. Check your application logs for these messages:

   ```bash
   Processing X lecturer constraints from frontend
   Processing subject constraints from Y subjects
   Subject #0 - ID: '...', Has availability field: True
   ```

2. If you see:
   - `Processing 0 lecturer constraints` → No lecturer constraints were added
   - `Has availability field: False` → Subjects don't have availability set

### Step 3: Verify Backend Received Constraints

Look for:

```bash
Final constraints dict: {'Lecturer Name': ['Mon', 'Fri'], 'SUBJECT_ID': ['Wed']}
```

Not seeing your constraints? Check:

- [ ] Did you click **"Add Lecturer Constraint"** button? (Just selecting isn't enough)
- [ ] Did you click **"Add Subject Constraint"** button? (Just selecting isn't enough)
- [ ] Are there checkboxes selected in the "Not Available On" / "Cannot Be Scheduled On" fields?
- [ ] Does the constraint appear in the list below the button?

## Troubleshooting

### Problem: Constraint buttons don't work

- Check browser console for JavaScript errors
- Verify lecturers/subjects dropdowns are populated (not empty)

### Problem: Constraints added but not showing in logs

- Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- Reload the page
- Try adding constraints again

### Problem: Backend shows `Final constraints dict: {}`

- This means constraints were NOT collected from the frontend
- Either:
  1. Constraints weren't added via the UI buttons
  2. Or there's a mismatch in how they're being collected

## Example: Complete Setup

1. **Lecturer Constraint:**
   - Select: "Dr. Smith"
   - Uncheck: Monday, Friday (mark as unavailable)
   - Click: "Add Lecturer Constraint"
   - Result: Constraint list shows "Dr. Smith — Mon, Fri"

2. **Subject Constraint:**
   - Select: "CS004 (Object-Oriented Programming)"
   - Uncheck: Wednesday, Thursday (can't schedule these days)
   - Click: "Add Subject Constraint"  
   - Result: Constraint list shows "CS004 — Wed, Thu"

3. **Generate:**
   - All constraints in the lists will be enforced
   - CS004 will NOT be scheduled on Wed/Thu
   - Dr. Smith will NOT teach on Mon/Fri
