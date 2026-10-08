# RatePilot — Sequential Task Platform

RatePilot uses a blue-first visual identity, a larger brand mark, and a redesigned responsive workspace with a desktop navigation rail and mobile navigation tabs.

## Sequential daily task rules

- Task order is numeric and deterministic; tasks are never randomly selected.
- Day 1 contains Tasks 1–20, Day 2 contains Tasks 21–40, Day 3 contains Tasks 41–60, and so on.
- Workers can start only the next task in sequence. The server enforces this rule.
- Completing all 20 tasks closes that worker's current day. The day does not roll over automatically.
- Operations Team must save a target for each day and separately approve access before the worker can start.
- The next day is created only by Operations Team after the current 20-task day is complete. Access is paused on creation and must be approved separately.
- The daily target cannot be changed after the worker has begun completing tasks for that day.
- Completing the final task automatically marks the cycle complete and pauses the worker's task access.

## Operations workflow

1. Open **Worker Task Cycles** and select a worker.
2. Enter the daily target and choose **Save Today's Target** for a day that has not started.
3. Check **Task access approved** and select **Save Approval** to unlock that day.
4. After the worker completes 20/20 tasks, enter the target for the next day and choose **Set Target & Create Next Day**.
5. Approve task access separately. The new day starts at Task 21, 41, 61, etc., depending on the day number.

## Combo Tasks and funding

- Combo Task settings are configured by Operations Team.
- Combo tasks use the same sequential task progression as normal tasks.
- Task costs are funded from Bonus Balance first, then Earning Balance. The backend remains authoritative for the actual debit.

## Development

- `npm run dev` — start the Express/Vite development server.
- `npm run lint` — TypeScript type-check.
- `npm run build` — build the frontend for production.

The repository also contains an alternative FastAPI implementation under `backend/`. The root `server.ts` entry point runs the Express API in `server/api.ts`.
