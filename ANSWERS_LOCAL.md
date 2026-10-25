# EchoCrime: ANSWERS and walkthrough (LOCAL ONLY, not on GitHub)

This file is in .gitignore. Do not commit it.


## The story
It is 11:47 PM at Riverside Museum. A valuable artifact has been stolen from its glass case.
The security cameras were switched off, but one microphone kept recording.
You are the detective. Find out **who did it** and **prove it**.

## Start the game
1. Open a terminal in the `EchoCrime` folder.
2. Run `npm install` (only the first time).
3. Run `npm run dev`.
4. Open the address it prints (usually http://localhost:5173) in Chrome.

Keep the terminal open while you play. The accusation needs it.

## Controls
| Key | What it does |
|---|---|
| **W A S D** | Walk (arrow keys also work) |
| **Shift** | Run |
| **Mouse** | Look around (click the 3D scene first) |
| **E** | Inspect the object in front of you |
| **Enter** | Collect the evidence you are inspecting |
| **Tab** | Open your evidence list |
| **T** | Open the timeline of the night |
| **M** | Open the map |
| **Esc** | Close whatever is open |

Typing in a text box never moves your character.

## The goal
Find the evidence, work out who is lying, then press the red **Accuse** button and name the thief.

## How to win, step by step

### Step 1: Find the first clue (Main Gallery)
You start here. Walk to the broken glass case in the middle.
When you see **"E - Inspect Broken Display Case"**, press **E**, then **Enter**.
*Evidence 1: Alarm Never Triggered.*

### Step 2: Search the East Gallery
Go through the doorway on the east side. Inspect these three things (E, then Enter):
- the **smashed window** (*Evidence 2: Broken Window*)
- the **scuff marks** on the floor (*Evidence 3: Running Footsteps*)
- the **metal bar** on the floor (*Evidence 4: Dropped Pry Bar*)

Press **T** after each one. A new event appears on your timeline.

### Step 3: The corridor and the loading bay
From the East Gallery, use the door at the east end of its south wall to reach the Staff Corridor.
- Inspect the **staff door** (*Evidence 5: Unlatched Staff Door*).
- Go south into the Loading Bay and inspect the **exit by the dock door** (*Evidence 7: Escape Vehicle*).

### Step 4: The Security Room terminal
The Security Room is next to the Main Gallery (door on the south wall, west side).
Walk to the **terminal** on the desk and press **E**.
*Evidence 6: Cameras Switched Off.* The **Audio Lab** opens.

### Step 5: Find the hidden clue (Evidence 8)
This one is not an object in the museum.
1. In the Audio Lab, press the **play** button and listen.
2. Around **11 seconds** there is a very quiet beep-beep-beep. It is not labelled.
3. Click the wavy graph at about **00:11**.
4. Press **Mark this moment**.

*Evidence 8: Facilities Radio Chirp.* If you marked the wrong spot, the lab tells you and you can try again.

### Step 6 (optional): "What if?"
In the Audio Lab, open the **What if?** tab. Type something like
*"What if the glass broke after the footsteps?"* and press **Reconstruct**.
It plays the same sounds in a different order. This is only for thinking. It is **not** evidence.

### Step 7: Find who is lying
Press **Esc** to leave the lab, then open **Theory** (top right).
1. Pick one suspect's statement.
2. Pick one clue.
3. Press **Test link**.

The game tells you if the clue **contradicts** the statement (they lied) or **supports** it (they told the truth).
Try the **Cameras Switched Off** clue against both of Alex Turner's statements.

### Step 8: Accuse
1. Press the red **Accuse** button (top right).
2. **Click a suspect.** The button stays grey until you do.
3. **Tick the clues** that point at that suspect.
4. **Write your theory** (see the example below).
5. Press **Accuse**.

You win if you pick the right suspect **and** tick at least **3 clues** that really point at them, from at least 2 different kinds. You get **3 tries**.

## The answer (spoiler: skip if you want to work it out yourself)
**The thief is Alex Turner**, the museum technician.

Clues that prove it:
- **Unlatched Staff Door**: opened with a maintenance override that logs nothing.
- **Alarm Never Triggered**: the alarm was switched off from the security system.
- **Cameras Switched Off**: a shared Facilities admin login cut the cameras, with no work order.
- **Dropped Pry Bar**: stamped "FACILITIES - A.T.".
- **Facilities Radio Chirp**: a Facilities radio was in the gallery at the time.
- **Escape Vehicle**: a small car left, not the contractor's van.

Broken Window and Running Footsteps only show the break-in was staged. Tick them if you like, but they don't count against Alex.

## Example theory you can copy
> Alex Turner stole the artifact. As a Facilities technician he used a maintenance override to open the staff door, which logs no entry, and cut the cameras from the shared admin login at 23:43. The alarm was disarmed from the security system, so only a technician could have done it. He smashed the east window from the inside to fake a break-in, then ran back through the staff corridor. He dropped a pry bar stamped "FACILITIES - A.T.", and a Facilities radio chirped on the tape. He escaped in a small car from the loading bay, not the contractor's van. His statements about being in the basement and calling security are contradicted by the terminal, which shows no work order and no call.

## What you see when you finish
- **Win:** a big green **YOU WIN!** screen with the full story of what happened.
- **Fail 3 times:** a red **CASE UNSOLVED** screen that reveals the truth anyway.

Close the screen with the **X**, **Esc**, or **Close and keep exploring**. Press **Play again from the start** to replay.

## Tips
- Walking past an object reveals nothing. You must press **E**.
- Press **Tab** to see which of the 8 clues you still need.
- Stuck? Press **M** for the map. Rooms with every clue found turn green.
- Do not refresh the page mid-game. It clears your progress.
- Grey Accuse button? You have not picked a suspect or ticked a clue yet.

---

# 90-second demo script

| Time | Do | Say |
|---|---|---|
| 0:00 | Start in the Main Gallery; walk toward the display case. | "Riverside Museum, 11:47 PM. A priceless artifact is gone and the cameras were off." |
| 0:12 | Press **E** at the case, **Enter** to collect. | "Evidence is found by inspecting, not by walking past it." |
| 0:22 | East doorway: window, then pry bar. Press **T**. | "Each clue unlocks an unlabelled event on the timeline: evidence-backed, not proof." |
| 0:40 | Staff door, then the Security Room terminal, **E**. | "The recording terminal opens the audio lab. The waveform is the actual file." |
| 0:50 | Play; click near 11 s, **Mark this moment**. | "One faint sound isn't labelled. Marking it finds the Facilities radio chirp." |
| 1:00 | **What if?** → "glass after the footsteps". | "It re-assembles the same sounds in a new order. A hypothesis, never evidence." |
| 1:10 | **Theory** → alex-1 vs terminal → *Contradiction*. | "The server checks the link; the answer key never ships to the browser." |
| 1:20 | **Accuse** → Alex + door, bar, terminal. | "Three independent clues needed." |
| 1:28 | Verdict and reveal. | "Case closed." |
