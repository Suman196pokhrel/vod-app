Without Pool:
Request 1 → Open new DB connection → Query → Close connection
Request 2 → Open new DB connection → Query → Close connection
Request 3 → Open new DB connection → Query → Close connection
...
```

**Problem**: Opening a new database connection is **slow** (TCP handshake, authentication, etc. = ~50-100ms). If you do this for every request, your app crawls.

---

## **The Solution: Connection Pool**
```
With Pool (5 connections pre-made):
┌─────────────────────────────────┐
│ Connection Pool                 │
│ [conn1, conn2, conn3, conn4, conn5] │ ← Already open, ready to use
└─────────────────────────────────┘

Request 1 → Borrow conn1 → Query → Return conn1 to pool
Request 2 → Borrow conn2 → Query → Return conn2 to pool
Request 3 → Borrow conn1 (reused!) → Query → Return conn1
Request 4 → Borrow conn3 → Query → Return conn3
Request 5 → Borrow conn4 → Query → Return conn4
Request 6 → Borrow conn5 → Query → Return conn5
Request 7 → WAIT (all 5 busy) → Borrow conn2 when free → ...
```

---

## **Why "5 connections"?**

It means your app can handle **5 concurrent database operations at the same time**.

### Example Scenario:
```
Time: 0ms
├─ User A requests signup  → Uses conn1
├─ User B requests login   → Uses conn2
├─ User C requests profile → Uses conn3
├─ User D requests posts   → Uses conn4
└─ User E requests friends → Uses conn5

Time: 50ms (User A done)
└─ User F requests signup  → Reuses conn1 (now free!)