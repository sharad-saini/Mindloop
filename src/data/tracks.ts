import type { LearningTrack } from "../types";

export const DEFAULT_TRACKS: LearningTrack[] = [
  {
    id: "track-react-ts",
    title: "Modern React & TypeScript Internals",
    tagline: "Master closure captures, structural subtyping, and batch scheduling.",
    description: "Deep-dive into the architectural mechanics behind React 19 rendering, stale closure traps in hooks, and TypeScript's compile-time type system.",
    category: "frontend",
    iconName: "Code2",
    color: "blue",
    concepts: [
      {
        id: "concept-closures-stale",
        trackId: "track-react-ts",
        title: "Stale Closures & Snapshot Rendering",
        category: "React Hooks",
        difficulty: "intermediate",
        estimatedMinutes: 4,
        summary: "React render functions are called on every state change. Event handlers and effects capture the values from the specific render pass they were instantiated in.",
        mentalModelAnchor: "Each render pass is an immutable photograph. A function defined inside that render holds a photo of the variables at that exact millisecond.",
        commonPitfalls: [
          "Calling setState multiple times assuming synchronous mutation",
          "Setting an interval in useEffect without tracking mutable ref or functional updater",
          "Passing callbacks with missing dependency arrays"
        ],
        questions: [
          {
            id: "q-stale-1",
            prompt: "What is the result when this button is clicked once if count starts at 0?",
            codeSnippet: `function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  };

  return <button onClick={handleClick}>{count}</button>;
}`,
            options: [
              "count becomes 1",
              "count becomes 3",
              "count throws an infinite loop warning",
              "count becomes 0 until the next tick"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Assuming `setCount` mutates the local `count` variable synchronously during execution.",
            counterExample: "In that single click handler frame, `count` is the constant 0. Each call evaluates to `setCount(0 + 1)`. All three enqueue setting the state to 1.",
            mentalModelRule: "A render is a frozen frame. To base new state on preceding enqueued updates in the same tick, always pass a functional updater: `setCount(prev => prev + 1)`.",
            explanation: "Because `count` is captured from the current render closure where its value is 0, all three calls pass 0 + 1 = 1 to the state queue."
          },
          {
            id: "q-stale-2",
            prompt: "A `setInterval` inside `useEffect` with an empty dependency array `[]` reads `count` to display on screen. What happens as time ticks?",
            codeSnippet: `useEffect(() => {
  const id = setInterval(() => {
    console.log("Count is:", count);
  }, 1000);
  return () => clearInterval(id);
}, []);`,
            options: [
              "It logs the current live count value every second",
              "It repeatedly logs the initial value of count (e.g. 0) forever",
              "It crashes because count cannot be read inside an effect callback",
              "It automatically re-subscribes whenever count changes"
            ],
            correctIndex: 1,
            misconceptionDiagnosis: "Believing a JavaScript callback dynamically re-binds to the newest component scope on every tick.",
            counterExample: "The timer closure was created once on mount and bound permanently to the mount frame's lexical environment where count was 0.",
            mentalModelRule: "Callbacks only see what existed when they were born unless given a mutable bridge (like useRef) or re-created with updated dependencies.",
            explanation: "With empty dependencies `[]`, the effect only runs on mount. The interval callback permanently closes over the initial render's `count`."
          }
        ]
      },
      {
        id: "concept-structural-typing",
        trackId: "track-react-ts",
        title: "Structural Subtyping vs Nominal Typing",
        category: "TypeScript",
        difficulty: "intermediate",
        estimatedMinutes: 5,
        summary: "TypeScript uses structural typing ('duck typing' for types). Type compatibility is based solely on the shape and members of the type, not how it was declared.",
        mentalModelAnchor: "TypeScript checks locks and keys by physical pin shape, not by the brand name stamped on the key.",
        commonPitfalls: [
          "Expecting an empty interface `{}` to only match empty objects",
          "Assuming excess property checks apply when assigning through intermediate variables",
          "Treating interfaces as runtime class validators"
        ],
        questions: [
          {
            id: "q-struct-1",
            prompt: "Why does TypeScript allow assigning an object with extra properties when assigned indirectly via a variable?",
            codeSnippet: `interface Point {
  x: number;
  y: number;
}

const rawData = { x: 10, y: 20, z: 30, color: "crimson" };
const p: Point = rawData; // Does this compile?`,
            options: [
              "Yes: rawData fulfills the contract because it contains required x and y numbers",
              "No: TypeScript strictly forbids any extra properties in all situations",
              "No: z and color cause a compiler error unless tagged with @ts-ignore",
              "Yes: but only if Point is defined as a class instead of an interface"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Confusing literal excess property checks (which happen only on direct inline object literals) with fundamental structural subtyping.",
            counterExample: "When passed directly `{ x: 10, y: 20, z: 30 } as Point`, TS warns about possible typos. But through variable reference `rawData`, structural compatibility governs: does it have x and y? Yes!",
            mentalModelRule: "Structural subtyping means 'at least these members'. Excess property checking is merely an ergonomic linter against typos on fresh literals.",
            explanation: "Under structural subtyping, an object with superset properties safely satisfies a subset requirement. Excess property check is only triggered on fresh object literals."
          }
        ]
      },
      {
        id: "concept-immutability-mutation",
        trackId: "track-react-ts",
        title: "Reference Identity & Shallow Re-render Gates",
        category: "React Core",
        difficulty: "beginner",
        estimatedMinutes: 4,
        summary: "React skips re-rendering when `Object.is(prevState, nextState)` is true. In-place mutations modify the object in memory without changing the pointer.",
        mentalModelAnchor: "If you paint a room inside a house, the street address (memory pointer) didn't change. React only checks the street address.",
        commonPitfalls: [
          "Mutating an array with array.push() then calling setItems(items)",
          "Expecting deep property changes to automatically notify React",
          "Creating new object literals in useMemo dependencies causing infinite loops"
        ],
        questions: [
          {
            id: "q-mut-1",
            prompt: "What happens when the following code executes?",
            codeSnippet: `const [todos, setTodos] = useState(["Write test"]);

const addTodo = () => {
  todos.push("Deploy release");
  setTodos(todos);
};`,
            options: [
              "React re-renders and displays both todos immediately",
              "React will NOT trigger a re-render because the array reference did not change",
              "React throws a TypeError: Cannot mutate state directly",
              "The browser tab locks up due to recursive dirty checking"
            ],
            correctIndex: 1,
            misconceptionDiagnosis: "Thinking React uses deep property observation (like Vue 2 getters or MobX proxies) by default.",
            counterExample: "React compares `Object.is(prevTodos, nextTodos)`. Since `todos` and `todos` point to the exact same heap address, React concludes nothing changed and bails out!",
            mentalModelRule: "Never mutate in place. Always produce a fresh identity: `setTodos([...todos, 'Deploy release'])`.",
            explanation: "`todos.push` mutates the existing array in memory. When `setTodos(todos)` is called, React checks `Object.is(oldState, newState)` which returns true, skipping the re-render."
          }
        ]
      }
    ]
  },
  {
    id: "track-distributed-systems",
    title: "Distributed Systems & Scalability",
    tagline: "Navigate network partitions, consistent hashing, and idempotency.",
    description: "Build an unshakable mental model of distributed consensus, split-brain realities, partition tolerance, and crash recovery.",
    category: "systems",
    iconName: "Network",
    color: "emerald",
    concepts: [
      {
        id: "concept-cap-theorem",
        trackId: "track-distributed-systems",
        title: "The CAP Theorem & Network Partitions",
        category: "Architecture",
        difficulty: "intermediate",
        estimatedMinutes: 5,
        summary: "In a network of computers, partitions (dropped messages, network splits) will inevitably occur. When a partition happens, a system must choose between returning stale data (Availability) or returning errors until nodes re-sync (Consistency).",
        mentalModelAnchor: "A telephone wire cut between two bank branches. A teller must either decline transactions (Consistency) or process them blindly and reconcile discrepancies later (Availability).",
        commonPitfalls: [
          "Believing you can build a CA system over a real-world network (you cannot choose CA across an unreliable physical network)",
          "Equating CAP 'Consistency' with ACID 'Consistency' (they mean fundamentally different things)",
          "Assuming high availability guarantees zero errors"
        ],
        questions: [
          {
            id: "q-cap-1",
            prompt: "Why can't a distributed system across two data centers choose 'CA' (Consistency + Availability without Partition Tolerance)?",
            options: [
              "Because network cables, routers, and switches can fail or drop packets, making network partitions inevitable",
              "Because CA databases require expensive quantum computers",
              "Because modern SSL certificates mandate partition protocols",
              "Because database locks cannot exceed 500 milliseconds"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Treating 'Partition Tolerance' as an optional feature you can toggle off in configuration.",
            counterExample: "A backhoe cuts an undersea fiber cable. Data Center East cannot talk to Data Center West. You do not get to 'opt out' of the cut cable.",
            mentalModelRule: "Partitions are not an architectural choice; they are physical laws of networks. Your only real choice during a partition is: do we stay Consistent (CP) or Available (AP)?",
            explanation: "You cannot prevent physical network partitions. When a partition happens, nodes either refuse writes to stay consistent, or accept writes and diverge in consistency."
          }
        ]
      },
      {
        id: "concept-idempotency-retries",
        trackId: "track-distributed-systems",
        title: "Idempotency Keys & Distributed Retries",
        category: "API Design",
        difficulty: "intermediate",
        estimatedMinutes: 4,
        summary: "In distributed networks, a timeout does not mean the server failed; it could mean the request succeeded but the acknowledgment packet was lost on the wire.",
        mentalModelAnchor: "Sending a letter to your friend with a check. If you never hear back, did they not get it, or did their thank-you postcard get lost in the rain?",
        commonPitfalls: [
          "Retrying payment requests on timeout without a unique idempotency key",
          "Generating the idempotency key inside the retry loop instead of before the initial attempt",
          "Assuming HTTP 504 Gateway Timeout guarantees no state changed on the origin"
        ],
        questions: [
          {
            id: "q-idem-1",
            prompt: "A client sends a charge request to a billing API and experiences a 10-second timeout error. What is the safest course of action?",
            options: [
              "Retry the request using the exact same unique client-generated Idempotency-Key",
              "Generate a new random UUID and retry immediately",
              "Assume the user was not charged and tell them to swipe their card again",
              "Send a DELETE request to cancel all pending charges"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Assuming a network timeout implies the backend never processed the charge.",
            counterExample: "The backend deducted $50 from the customer's balance, but the WiFi dropped right before returning HTTP 200. Retrying with a new ID charges them $100!",
            mentalModelRule: "Tie the action to an immutable intent key created before the first transmission. The server recognizes the duplicate key and safely replays the cached result.",
            explanation: "The initial charge may have succeeded. Re-sending with the original Idempotency-Key allows the server to recognize the duplicate and return the previous response without charging twice."
          }
        ]
      },
      {
        id: "concept-consistent-hashing",
        trackId: "track-distributed-systems",
        title: "Consistent Hashing vs Modulo Sharding",
        category: "Distributed Storage",
        difficulty: "advanced",
        estimatedMinutes: 6,
        summary: "Simple hash modulo `hash(key) % N` causes nearly 100% of keys to move when nodes are added or removed. Consistent hashing maps keys and nodes onto a circular ring, so changing nodes only relocates K/N keys.",
        mentalModelAnchor: "Seating people in a circle. Adding a new chair only inconveniences the one person sitting immediately clockwise from that chair.",
        commonPitfalls: [
          "Using modulo sharding for dynamic caches where servers frequently scale up/down",
          "Forgetting virtual nodes (vnodes), causing severe hotspots on uneven rings",
          "Believing consistent hashing eliminates data movement completely"
        ],
        questions: [
          {
            id: "q-hash-1",
            prompt: "If you have 1,000,000 keys distributed across 10 cache servers using `hash(key) % 10`, what percentage of keys must move if 1 server crashes (leaving 9 servers)?",
            options: [
              "Approximately 90% of all keys will remap to different servers",
              "Exactly 10% of keys (only the ones that were on the crashed server)",
              "Zero keys because the remaining 9 servers absorb the remainder",
              "100% of keys are corrupted immediately"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Intuition tells us only 1 out of 10 nodes died, so only 10% of data should be affected.",
            counterExample: "Because `x % 10` is mathematically decoupled from `x % 9`, almost every key's new remainder points to an entirely different node. This causes a devastating cache stampede!",
            mentalModelRule: "Modulo sharding reshuffles the entire deck whenever the deck size changes. Consistent hashing preserves existing placements and only shifts adjacent neighbors.",
            explanation: "Changing the divisor in modulo arithmetic changes the destination for (N-1)/N of keys (~90%). Consistent hashing fixes this by bounding key migrations to 1/N."
          }
        ]
      }
    ]
  },
  {
    id: "track-algorithms-structures",
    title: "Algorithmic Intuition & Data Structures",
    tagline: "Develop instinctive pattern recognition for complexity and invariants.",
    description: "Transform algorithmic problem solving from brute memorization into crystalline intuition for sliding windows, amortized costs, and monotonic properties.",
    category: "algorithms",
    iconName: "Binary",
    color: "purple",
    concepts: [
      {
        id: "concept-two-pointers-window",
        trackId: "track-algorithms-structures",
        title: "Two Pointers vs Sliding Window Invariants",
        category: "Algorithms",
        difficulty: "intermediate",
        estimatedMinutes: 5,
        summary: "The sliding window and two-pointer techniques convert O(N^2) search spaces into O(N) linear scans by leveraging monotonicity: when moving a pointer only causes the condition to monotonically increase or decrease.",
        mentalModelAnchor: "A telescoping caterpillar crawling across a branch: the front head expands forward until full, then the tail contracts forward to digest.",
        commonPitfalls: [
          "Applying sliding window to arrays with negative numbers where sum monotonicity is broken",
          "Resetting the left pointer back to 0 on mismatch, degenerating into O(N^2)",
          "Confusing fixed-size window problems with dynamic condition-based windows"
        ],
        questions: [
          {
            id: "q-tp-1",
            prompt: "Why does the standard sliding window algorithm fail to find the 'longest subarray with sum <= K' if the array contains negative numbers?",
            options: [
              "Because expanding the right pointer no longer guarantees the window sum will increase monotonically",
              "Because negative numbers cannot be stored in standard CPU registers",
              "Because array index lookups fail on negative offsets",
              "Because the time complexity becomes O(2^N) automatically"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Assuming that moving a pointer rightward always increases the window sum.",
            counterExample: "If the window has sum 10 and the next element is -15, expanding the window actually decreased the sum to -5! You can no longer safely contract the left pointer based on a threshold.",
            mentalModelRule: "Sliding window requires monotonic directionality. When adding elements can either increase OR decrease your metric, look to prefix sums + hash maps instead.",
            explanation: "Sliding window works only when adding an element consistently moves the constraint in one direction. Negative values break this monotonicity."
          }
        ]
      },
      {
        id: "concept-amortized-complexity",
        trackId: "track-algorithms-structures",
        title: "Amortized O(1) vs Worst-Case Guarantees",
        category: "Complexity Analysis",
        difficulty: "beginner",
        estimatedMinutes: 4,
        summary: "Dynamic arrays (like JavaScript arrays, Python lists, or C++ std::vector) double in capacity when full. While the resizing copy takes O(N) time, it happens so infrequently that average cost per insert is O(1).",
        mentalModelAnchor: "Paying a quarterly trash collection bill. You don't pay every time you throw a napkin in the bin, but when the bill arrives you pay for the whole season.",
        commonPitfalls: [
          "Confusing amortized O(1) with real-time worst-case latency guarantees (e.g. in audio synthesis or missile guidance)",
          "Assuming appending to an array is strictly constant time on every single CPU cycle",
          "Growing an array by adding a constant +10 elements instead of multiplying by a factor (e.g. 1.5x or 2x)"
        ],
        questions: [
          {
            id: "q-amort-1",
            prompt: "What would happen to the amortized time complexity of `push()` if a dynamic array resized by adding a fixed 100 extra slots each time it became full, instead of doubling?",
            options: [
              "Amortized time degrades from O(1) to O(N) per insertion",
              "Amortized time remains O(1) but uses less RAM",
              "Time complexity becomes O(log N) due to linear scans",
              "The garbage collector crashes"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Assuming any resizing strategy yields amortized constant time as long as copies don't happen every single item.",
            counterExample: "To insert 1,000,000 items with +100 increments, you perform 10,000 reallocations, copying 100 + 200 + ... + 1,000,000 items = ~50 billion copies! That's O(N^2) total work, or O(N) per push!",
            mentalModelRule: "Geometric growth (multiplying by 1.5x or 2x) charges enough prepaid credits to pay for the next copy. Arithmetic growth (+K) bankrupts the time budget.",
            explanation: "Doubling guarantees the number of copies is bounded by a geometric series sum <= 2N. Fixed-size expansion creates an arithmetic series sum of N^2 / (2*K), making each insertion O(N)."
          }
        ]
      },
      {
        id: "concept-fast-slow-pointers",
        trackId: "track-algorithms-structures",
        title: "Fast & Slow Pointers (Floyd's Cycle Detection)",
        category: "Algorithms",
        difficulty: "intermediate",
        estimatedMinutes: 5,
        summary: "Traversing with two pointers moving at different speeds (1 step vs 2 steps) detects cycles in finite state machines and linked lists with O(1) extra space.",
        mentalModelAnchor: "Two runners on a circular track. The faster runner must eventually lap the slower runner from behind, guaranteeing an intersection inside any loop.",
        commonPitfalls: [
          "Using a hash set to store visited node references, incurring unnecessary O(N) memory overhead",
          "Forgetting to check fast.next != null before dereferencing fast.next.next, causing NullPointer exceptions",
          "Assuming meeting point is the exact cycle entry node rather than the phase-1 intersection point"
        ],
        questions: [
          {
            id: "q-fs-1",
            prompt: "Why is Floyd's Tortoise and Hare algorithm guaranteed to detect a cycle of length C in O(N) time without infinite looping?",
            options: [
              "Because with every tick, the relative distance between the fast pointer and slow pointer decreases by exactly 1 within the cycle",
              "Because the pointers travel in opposite directions",
              "Because circular linked lists automatically signal hardware interrupts",
              "Because fast pointer skips the cycle boundary entirely"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Believing the fast runner can continuously hop over the slow runner indefinitely inside a modular loop.",
            counterExample: "Since fast moves 2 and slow moves 1, the gap changes by (2 - 1) = 1 step per cycle. A distance decremented by 1 modulo C must hit exactly 0.",
            mentalModelRule: "Relative velocity of 1 step/tick leaves zero blind spots. You cannot hop over an element when the relative approach speed is 1.",
            explanation: "Every step reduces the gap between fast and slow by 1 inside the loop. Therefore they must collide in at most C iterations."
          }
        ]
      },
      {
        id: "concept-monotonic-stack",
        trackId: "track-algorithms-structures",
        title: "Monotonic Stack & Next Greater Element Invariants",
        category: "Data Structures",
        difficulty: "advanced",
        estimatedMinutes: 6,
        summary: "A monotonic stack maintains elements in strictly increasing or decreasing order. It solves 'next greater element' and largest rectangle problems in linear O(N) time.",
        mentalModelAnchor: "People standing in a queue where taller people completely block the view of shorter people behind them. Anyone shorter gets popped off the horizon.",
        commonPitfalls: [
          "Pushing elements without popping violated invariants, losing the monotonicity property",
          "Storing values instead of array indices, preventing span/distance calculations",
          "Assuming monotonic stack requires nested loops that cause O(N^2) worst case (each element is pushed and popped at most once)"
        ],
        questions: [
          {
            id: "q-mono-1",
            prompt: "Even though a monotonic stack uses a while loop inside a for loop, why is its total time complexity strictly O(N)?",
            options: [
              "Because every element is pushed onto the stack exactly once and popped at most once across the entire traversal",
              "Because the stack is capped at 10 items maximum",
              "Because modern CPUs vectorize monotonic comparisons",
              "Because it uses binary search internally"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Assuming nested loops always imply O(N^2) multiplicative complexity.",
            counterExample: "If 1,000 elements were pushed, at most 1,000 total pop operations can ever execute in the entire program run. Aggregate work is 2N operations.",
            mentalModelRule: "Amortize by element lifecycle: if each entity is created once and destroyed once, total operations are 2N, giving O(N) linear time.",
            explanation: "Total stack push operations = N. Total stack pop operations <= N. Total operations across all inner while loop iterations are bounded by 2N = O(N)."
          }
        ]
      },
      {
        id: "concept-binary-search-space",
        trackId: "track-algorithms-structures",
        title: "Binary Search Over Monotonic Solution Space",
        category: "Algorithms",
        difficulty: "intermediate",
        estimatedMinutes: 5,
        summary: "Binary search applies not just to sorted arrays, but to any monotonic feasibility function f(x) -> boolean where if condition holds for x, it holds for all x' > x.",
        mentalModelAnchor: "Guessing a secret number with 'Too high' or 'Too low' hints. The answer space has a sharp cliff dividing impossible answers from possible answers.",
        commonPitfalls: [
          "Integer overflow when calculating midpoint as (low + high) / 2 instead of low + (high - low) / 2",
          "Infinite loops caused by incorrect pointer adjustments (e.g. low = mid instead of low = mid + 1)",
          "Failing to recognize that minimization problems map directly to monotonic predicate functions"
        ],
        questions: [
          {
            id: "q-bs-1",
            prompt: "What mathematical property MUST the predicate function `isValid(capacity)` satisfy for binary search on answer to work?",
            options: [
              "Monotonicity: there exists a transition threshold where all values on one side are false and all on the other are true",
              "The predicate must execute in O(1) constant time",
              "The values must be prime numbers",
              "The array must not contain any duplicate elements"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Assuming binary search only applies to physical arrays that have already been pre-sorted in memory.",
            counterExample: "If capacity 10 is valid, capacity 11 must also be valid. The answer range [1..max] behaves like a virtual boolean array: [F, F, F, T, T, T]. We simply search for the first True!",
            mentalModelRule: "If a boolean predicate never toggles back and forth, binary search will find the exact boundary in O(log(range)) checks.",
            explanation: "Monotonicity guarantees that testing a midpoint safely eliminates half of the remaining search space with 100% certainty."
          }
        ]
      },
      {
        id: "concept-graph-topological",
        trackId: "track-algorithms-structures",
        title: "Graph Traversal & Topological Ordering (Kahn's / DFS)",
        category: "Graph Algorithms",
        difficulty: "advanced",
        estimatedMinutes: 6,
        summary: "Topological sort orders vertices in a directed acyclic graph (DAG) such that for every directed edge u -> v, u comes before v. It detects dependency cycles and schedules tasks.",
        mentalModelAnchor: "Putting on clothes in the morning: socks must go on before shoes, and underwear before pants. You cannot resolve dependencies if there is a circular dependency.",
        commonPitfalls: [
          "Attempting topological sort on a graph containing directed cycles without cycle detection",
          "Confusing in-degree (prerequisites) with out-degree (dependents)",
          "Failing to handle disconnected graph components"
        ],
        questions: [
          {
            id: "q-topo-1",
            prompt: "In Kahn's Algorithm, what does it mean if the queue becomes empty before all V vertices have been processed?",
            options: [
              "The graph contains at least one directed cycle, making a valid topological ordering impossible",
              "The graph is an undirected tree",
              "All vertices have successfully been sorted",
              "Memory allocation failed"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Assuming every graph with vertices can be linearly sorted.",
            counterExample: "If Task A requires Task B, and Task B requires Task A, both have in-degree >= 1 forever. Neither can ever be added to the queue of zero-prerequisite tasks!",
            mentalModelRule: "A cycle traps dependencies: no node in the cycle can ever reach in-degree 0. Unprocessed nodes after BFS prove a circular deadlock.",
            explanation: "Kahn's algorithm only enqueues nodes with in-degree 0. In a cycle, every node has an incoming edge, so no cycle node can ever be enqueued."
          }
        ]
      },
      {
        id: "concept-dp-dag",
        trackId: "track-algorithms-structures",
        title: "Dynamic Programming & DAG Memoization Transitions",
        category: "Dynamic Programming",
        difficulty: "advanced",
        estimatedMinutes: 6,
        summary: "Dynamic Programming is shortest path traversal on a Directed Acyclic Graph of subproblems. Optimal substructure and overlapping subproblems allow memoizing intermediate results.",
        mentalModelAnchor: "Writing down 1 + 1 + 1 = 3 on a paper. If asked 'what is + 1?', you don't recalculate 1+1+1 from scratch; you remember 3 and simply add 1.",
        commonPitfalls: [
          "Attempting dynamic programming on state graphs with negative cycles or circular state dependencies",
          "Creating high-dimensional state arrays when only the previous row/state is required for transitions",
          "Confusing greedy choice property with optimal substructure"
        ],
        questions: [
          {
            id: "q-dp-1",
            prompt: "What is the fundamental difference between Divide-and-Conquer (like Merge Sort) and Dynamic Programming?",
            options: [
              "Dynamic Programming caches overlapping subproblems that are solved repeatedly, whereas Divide-and-Conquer solves independent disjoint subproblems",
              "Dynamic Programming only works for arrays of integers",
              "Divide-and-Conquer cannot be implemented recursively",
              "Dynamic Programming always runs in O(1) space"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Thinking DP is just recursion with a different name.",
            counterExample: "Computing Fibonacci(5) computes Fibonacci(3) twice. Without memoization, branches explode to O(2^N). With memoization, overlapping states are resolved in O(N).",
            mentalModelRule: "Divide-and-Conquer splits into fresh separate worlds. Dynamic Programming navigates a shared graph of recurring states.",
            explanation: "Overlapping subproblems are the signature requirement for DP. If subproblems do not overlap, plain recursion or divide-and-conquer is sufficient."
          }
        ]
      }
    ]
  },
  {
    id: "track-mental-models",
    title: "Critical Thinking & Cognitive Biases",
    tagline: "Sharpen engineering judgment, metric design, and diagnostic reasoning.",
    description: "Learn how human cognition fails in complex system design: survivorship blind spots, proxy metric collapse, and probabilistic fallacies.",
    category: "cognition",
    iconName: "BrainCircuit",
    color: "amber",
    concepts: [
      {
        id: "concept-goodharts-law",
        trackId: "track-mental-models",
        title: "Goodhart's Law & Proxy Metric Collapse",
        category: "System Dynamics",
        difficulty: "intermediate",
        estimatedMinutes: 4,
        summary: "When a measure becomes a target, it ceases to be a good measure. People optimize directly for the proxy metric rather than the underlying goal.",
        mentalModelAnchor: "A nail factory evaluated by total weight of nails produced makes one giant 5-ton useless nail. Evaluated by nail count, they make 10 million microscopic pins.",
        commonPitfalls: [
          "Rewarding developers on lines of code written (leading to verbose, unmaintainable code)",
          "Measuring QA testers purely by bug count (leading to filing trivial grammar bugs)",
          "Using 100% test coverage as a hard deployment gate without verifying assertion quality"
        ],
        questions: [
          {
            id: "q-goodhart-1",
            prompt: "An engineering leadership team mandates that every engineer's bonus is tied to achieving 'zero unresolved Jira tickets' by Friday 5 PM. What is the classic Goodhart's Law outcome?",
            options: [
              "Engineers close critical tickets prematurely, mark complex bugs as 'Cannot Reproduce', or avoid logging newly discovered bugs",
              "All software bugs in the system permanently disappear from the codebase",
              "Customers report a 100% satisfaction score",
              "Server CPU utilization drops to zero"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Believing that measuring an indicator forces the underlying real-world reality to conform to the ideal.",
            counterExample: "The proxy metric was 'open tickets in Jira'. The real goal was 'high quality software'. Engineers optimize the Jira ticket count because that is what is rewarded, while the code quality stays the same or worsens.",
            mentalModelRule: "Always ask: 'If an adversary wanted to maximize this number without doing the real work, how easily could they game it?' Pair every metric with a counter-balancing metric.",
            explanation: "When an operational metric is tied to incentives, participants game the metric rather than addressing the actual underlying objective."
          }
        ]
      },
      {
        id: "concept-survivorship-bias",
        trackId: "track-mental-models",
        title: "Survivorship Bias in System Architecture",
        category: "Cognitive Biases",
        difficulty: "beginner",
        estimatedMinutes: 4,
        summary: "Drawing conclusions by only studying the entities that successfully passed a selection filter, while ignoring those that failed and were eliminated from view.",
        mentalModelAnchor: "Abraham Wald studying WW2 bombers: armoring the bullet holes on planes that returned, rather than the un-hit areas where the downed planes were struck.",
        commonPitfalls: [
          "Copying Netflix or Google microservice architecture for a 3-person startup because Netflix is successful",
          "Surveying only existing active users on churn without reaching out to users who abandoned the app",
          "Analyzing only successful HTTP 200 logs to evaluate API response speed"
        ],
        questions: [
          {
            id: "q-surv-1",
            prompt: "In World War II, mathematician Abraham Wald was asked where to add armor to returning aircraft covered in bullet holes on the wings and fuselage. What did he recommend?",
            options: [
              "Add armor to the engines and cockpit where there were NO bullet holes on returning planes",
              "Add armor exactly where the bullet holes were densest on the wings",
              "Remove all armor to make the planes fly faster",
              "Paint the planes in camouflage colors"
            ],
            correctIndex: 0,
            misconceptionDiagnosis: "Focusing purely on the visible evidence in front of you while forgetting the invisible denominator of destroyed aircraft.",
            counterExample: "Planes with bullet holes in the wings survived and flew home. Planes shot in the engines crashed and never made it back to the airfield to be surveyed!",
            mentalModelRule: "Never evaluate a system based solely on the survivors. Ask: 'Where are the corpses? What failures never made it into my dataset?'",
            explanation: "The returning planes demonstrated where a plane could be shot and still survive. Planes hit in the undamaged areas had crashed."
          }
        ]
      }
    ]
  }
];
