import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Braitenberg vehicle",
      def: "A robot whose sensors are wired almost directly to its motors (Valentino Braitenberg, 1984). Same-side or crossed, excitatory or inhibitory connections produce approach or avoidance with no map and no memory.",
    },
    {
      term: "Reactive behavior",
      def: "A control rule that maps the current sensor readings straight to wheel commands, such as obstacle avoidance or wall following. Fast and simple, but it cannot escape situations that repeat.",
    },
    {
      term: "Bug2 and the M-line",
      def: "A goal-seeking algorithm (Lumelsky and Stepanov, 1987): drive along the start-to-goal line (M-line), follow any obstacle boundary you hit, and leave only on the M-line at a point closer to the goal than the hit point.",
    },
    {
      term: "Finite state machine (FSM)",
      def: "A set of states, the events that move between them and the action each state runs every tick. Makes behavior selection explicit and testable.",
    },
    {
      term: "Hysteresis",
      def: "Different thresholds for entering and leaving a state, for example enter Avoid below 20 cm and leave above 30 cm, so sensor noise cannot make the state chatter.",
    },
    {
      term: "Behavior tree",
      def: "A tree of Sequence, Fallback and action nodes ticked at a fixed rate, each returning SUCCESS, FAILURE or RUNNING. Scales to dozens of behaviors; Nav2 in ROS 2 runs on BehaviorTree.CPP.",
    },
    {
      term: "Occupancy grid",
      def: "A map of square cells (often 5 cm) holding the probability that each cell is occupied, usually stored as log-odds so each sensor update is an addition.",
    },
    {
      term: "SLAM",
      def: "Simultaneous localization and mapping: estimating the map and the robot's pose together. Loop closures, recognizing a place seen before, remove accumulated drift.",
    },
    {
      term: "A* search",
      def: "Graph search that expands nodes in order of f = g + h, the cost so far plus a heuristic estimate to the goal. Optimal when h never overestimates; much faster than Dijkstra in open space.",
    },
  ],
  scenario: {
    title: "The robot circles forever in the corner of the test pen",
    context:
      "A student team's exploration robot (three HC-SR04 rangers at −45°, 0° and +45°, reactive steering that blends goal-seeking with obstacle avoidance) must cross a 3 m × 3 m pen and reach a charging beacon behind a low L-shaped wall. In 4 of 10 runs it drives into the inside corner of the L and stays there, sweeping left and right, until the battery runs flat.",
    symptoms: [
      "Telemetry shows the turn command flipping sign about every 1.2 s while the front range bounces between 18 cm and 35 cm",
      "The pose trace draws the same small figure-eight in the corner over and over",
      "Moving the beacon 30 cm to the side makes the problem vanish for that layout",
      "Lowering the steering gains only makes the oscillation slower",
    ],
    hints: [
      "A controller with no memory always outputs the same command for the same readings. What happens when the readings repeat?",
      "In a concave corner, turning away from one wall points the robot at the other wall, while the goal keeps pulling it back in.",
      "Bug2 escapes concave obstacles by remembering two things. What are they, and what would the robot need to remember here?",
    ],
    rootCause:
      "The controller is purely reactive: wheel commands are a fixed function of the three ranges and the goal bearing. Inside the concave corner, the goal pulls the robot in, each wall pushes it toward the other wall, and the blend has a stable local minimum. Because nothing in the controller changes over time, the same readings reproduce the same actions and the robot settles into a limit cycle. Lower gains only stretch the cycle out.",
    fix:
      "Add state and memory with a small FSM. On a hit, enter WALL_FOLLOW, commit to one turn direction for at least 2 s, follow the wall Bug2-style and leave only when back on the start-to-goal line closer to the goal than the hit point. Add a stuck detector: less than 10 cm of progress toward the goal in 5 s triggers an escape that turns 120° and drives 40 cm. With about 25 extra lines of code the robot reached the beacon in 10 of 10 runs.",
    lesson:
      "Reactive behaviors fail in local minima because they cannot tell this moment from the last one. Give the robot memory: commit to decisions for a minimum time, remember where it hit an obstacle, and detect lack of progress.",
  },
  interview: [
    {
      q: "How would you make a robot follow a black line with two reflectance sensors?",
      a: "I would mount the two sensors a few millimeters above the floor, straddling the line, and turn their readings into an error: with digital outputs it is −1, 0 or +1, with analog outputs (L − R)/(L + R) gives a proportional error. A PD law, for example turn = 0.6·e + 0.05·de/dt on top of a base speed of 0.5, steers back toward the line, and I would slow the base speed as the error grows so it does not overshoot curves. The important part is the lost-line case: remember which side the line was last seen on and arc or spin toward it, with a timeout of a few seconds before stopping. I would calibrate the threshold on the actual floor and tape, because carpet, glossy tile and sunlight all shift the readings.",
      level: "screen",
    },
    {
      q: "What is hysteresis in a robot state machine, and why do you need it?",
      a: "Hysteresis means using different thresholds to enter and to leave a state. If Avoid starts below 20 cm and ends above 20 cm, an ultrasonic reading that jitters by a centimeter around 20 cm flips the state every tick, and the robot twitches between two actions. With entry at 20 cm and exit at 30 cm, noise smaller than 10 cm cannot cause a transition. You can get a similar effect with a minimum time in state, for example staying in Avoid for at least 0.8 s. Both keep the actuators from chattering and make the behavior predictable enough to test.",
      level: "screen",
    },
    {
      q: "When would you choose a behavior tree over a finite state machine?",
      a: "For a handful of behaviors an FSM is the clearest choice: four states and eight transitions fit on one diagram and are easy to test. As behaviors grow, an FSM's transitions grow roughly with the square of the states, and adding one behavior means editing many transitions. A behavior tree composes behaviors hierarchically with Sequence and Fallback nodes, so adding a recovery is adding a subtree, and priorities are visible as left-to-right order. That is why Nav2 uses BehaviorTree.CPP for navigation with dozens of recovery and planning behaviors. On a microcontroller with three behaviors I would still write a switch statement.",
      level: "screen",
    },
    {
      q: "Compare Dijkstra and A*. When is A* optimal, and what happens with a bad heuristic?",
      a: "Both search a graph such as an occupancy grid. Dijkstra expands nodes in order of cost so far, g, so it explores a growing circle around the start and always finds the shortest path. A* expands in order of f = g + h, where h estimates the remaining cost, so it explores a narrow band toward the goal and often visits ten times fewer cells in open space. If h never overestimates the true remaining cost (admissible), A* is still optimal; Euclidean distance is admissible for any-angle moves and Manhattan distance for 4-connected grids. If h overestimates, A* gets faster but can return a longer path, and with h = 0 it degrades exactly into Dijkstra.",
      level: "deep",
    },
    {
      q: "Explain SLAM to a firmware engineer in about a minute, including loop closure.",
      a: "To build a map you need to know where you are, and to know where you are you need a map, so SLAM estimates both at once. The robot predicts its motion from odometry, which drifts, and corrects it by matching what the lidar or camera sees against the map built so far. Graph-based SLAM, used by Cartographer and slam_toolbox, stores poses as nodes and measurements as constraints, then solves for the poses that best satisfy all constraints. Loop closure is when the robot recognizes a place it has visited before; that one constraint pulls the whole trajectory back into shape and removes drift accumulated over the loop. The firmware engineer's part matters a lot: good timestamps and clean odometry make SLAM converge.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "A Braitenberg-style avoider commands left = 0.6 − 0.8·pR and right = 0.6 − 0.8·pL, where p is proximity. An obstacle appears on the right. What does the robot do?",
      choices: ["Turns left, away from the obstacle", "Turns right, toward the obstacle", "Stops", "Keeps driving straight"],
      answer: 0,
      explain:
        "A right-side obstacle raises pR, which slows the left wheel. With the right wheel faster than the left, ω = (vR − vL)/L is positive, so the robot turns left, away from the obstacle.",
    },
    {
      q: "When does Bug2 leave an obstacle boundary?",
      choices: [
        "As soon as the goal comes into line of sight, wherever it is on the boundary",
        "When it meets the M-line at a point closer to the goal than where it hit the obstacle",
        "After one full lap of the obstacle, when it is back at the point where it hit",
        "After a fixed timeout, measured from the moment it first touched the obstacle",
      ],
      answer: 1,
      explain:
        "Bug2 only leaves on the start-to-goal M-line and only when it is closer to the goal than the hit point. That rule guarantees progress, which is why Bug2 cannot loop forever around a concave obstacle the way Bug0 can.",
    },
    {
      q: "An FSM enters Avoid when the front range drops below 20 cm and leaves when it rises above 30 cm. What is the 10 cm gap for?",
      choices: [
        "To save battery by running the avoid behavior less often",
        "To keep sensor noise near one threshold from toggling the state every tick",
        "To make the robot drive faster once the obstacle is behind it",
        "Because ultrasonic sensors cannot return a valid reading between 20 and 30 cm",
      ],
      answer: 1,
      explain:
        "This is hysteresis. An HC-SR04 reading jitters by about a centimeter; with a single threshold the state would flip back and forth, and the motors would chatter between two commands.",
    },
    {
      q: "A* is guaranteed to return a shortest path when its heuristic",
      choices: [
        "is always zero",
        "never overestimates the true remaining cost",
        "always overestimates the remaining cost",
        "is computed with a neural network",
      ],
      answer: 1,
      explain:
        "An admissible heuristic (never overestimating) keeps A* optimal. Zero is admissible too, but then A* is exactly Dijkstra and loses its speed advantage; an overestimating heuristic is faster but can return a longer path.",
    },
    {
      q: "How many cells does an occupancy grid of a 10 m × 10 m room have at 5 cm resolution?",
      choices: ["400", "4,000", "40,000", "4,000,000"],
      answer: 2,
      explain:
        "Each side has 10 m / 0.05 m = 200 cells, and 200 × 200 = 40,000. At one byte of log-odds per cell that is 40 kB, small enough for an ESP32 with 520 kB of SRAM.",
    },
    {
      q: "Both line sensors suddenly read white. What should a robust line follower do first?",
      choices: [
        "Drive straight at full speed until it finds the line again, then resume following",
        "Turn toward the side where the line was last seen, with a timeout",
        "Reverse to the starting point and begin the course again",
        "Reset the microcontroller so the sensors recalibrate",
      ],
      answer: 1,
      explain:
        "The line usually left the sensors on the side it curved toward, so the last-seen side is stored in memory and the robot arcs or spins that way. A timeout of a few seconds prevents it from wandering off the table if the line is really gone.",
    },
    {
      q: "What does a loop closure do in SLAM?",
      choices: [
        "Closes the control loop around the wheel motors so the robot tracks the planned path",
        "Recognizes a place seen before and uses that constraint to pull the drift out of the whole trajectory",
        "Stops the robot when the map is complete and every frontier has been explored",
        "Fills unknown cells in the occupancy grid with free space once the robot has driven all the way around them",
      ],
      answer: 1,
      explain:
        "Odometry drift accumulates around a loop. When the robot recognizes the start of the loop, the new constraint between the current and the old pose lets the optimizer spread the correction over every pose in between.",
    },
  ],
};

export default data;
