import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Model Context Protocol (MCP)",
      def: "An open protocol, announced by Anthropic in November 2024, that standardises how an AI application discovers and calls tools, reads resources and uses prompts from a server, using JSON-RPC 2.0 messages.",
    },
    {
      term: "MCP host, client and server",
      def: "The host (Claude Desktop) runs one MCP client per configured server. The server exposes capabilities, and for a local server the host launches it as a subprocess and talks over stdio.",
    },
    {
      term: "stdio transport",
      def: "The transport where the host starts the server as a child process and exchanges newline-delimited JSON on its standard input and output. Because stdout carries the protocol, a server must never print to it.",
    },
    {
      term: "Tool schema",
      def: "The name, description and JSON Schema of a tool's arguments. The model reads it to decide what to call, so limits written into the schema (such as minimum: 1.5) are visible before any call.",
    },
    {
      term: "FastMCP",
      def: "The high-level server API in the Python mcp package. Decorating a typed function with @mcp.tool() generates its schema from the type hints and its description from the docstring.",
    },
    {
      term: "claude_desktop_config.json",
      def: "The file in which Claude Desktop lists mcpServers, each with a command and arguments. Use absolute paths, because the app does not inherit your shell PATH, and fully restart the app after editing.",
    },
    {
      term: "build123d",
      def: "An open-source Python code-CAD library on the OpenCascade kernel. Scripts build solids with booleans and fillets, query faces and edges, and export STEP or STL.",
    },
    {
      term: "DFM gate",
      def: "A rule that a tool refuses to proceed unless a manufacturability check passed, such as export_step running dfm_check itself. It makes verification impossible to skip.",
    },
    {
      term: "Negative test",
      def: "A test with a design that is supposed to fail a checker. A checker that has never been shown a bad part has not been shown to work.",
    },
    {
      term: "MCP Inspector",
      def: "The official debugging tool, started with npx @modelcontextprotocol/inspector, that connects to a server, lists its tools and lets you call them with chosen arguments.",
    },
  ],
  scenario: {
    title: "Claude keeps designing 0.5 mm walls",
    context:
      "A startup lets Claude Desktop design lightweight brackets through its CAD MCP server. The engineer's rule, nothing thinner than 1.5 mm for 6061 on the shop's mill, lives in the project prompt. Three times in a row Claude returns a bracket with a 0.5 mm web, exports STEP and describes the part as optimised for weight. The quote request bounces: the shop cannot hold flatness on a 0.5 mm web and the part chatters under the cutter.",
    symptoms: [
      "export_step succeeds every time and returns a path, so nothing in the chat looks wrong",
      "The same 0.5 mm value shows up in three separate conversations, even after the engineer repeats the rule in chat",
      "dfm_check exists, but Claude only calls it when asked, and the one time it ran it reported pass",
    ],
    hints: [
      "Where does the 1.5 mm rule live today: in the tool, or in a prompt that the model can weigh against a goal like “lightweight”?",
      "Why would a DFM check pass a 0.5 mm part? What does it actually measure?",
      "Which tool could refuse to write a file, and what would it have to know first?",
    ],
    rootCause:
      "The constraint was advice, not enforcement. It lived only in a prompt that competes with the request for a light part, so the model traded it away. The tools accepted any positive thickness, so a 0.5 mm plate was a valid call. export_step wrote whatever it was given and was not gated on dfm_check, so verification was optional. And the one DFM run passed because the first version measured only hole-to-hole ligaments and never looked at the plate thickness, so it could not see the problem.",
    fix: "Put the rule where it cannot be negotiated. Constrain the parameter in the tool schema (thickness at least 1.5 mm), which the model sees up front and the server enforces before any code runs. Make dfm_check measure the thinnest section, including the bounding-box thickness and not only the ligaments around holes. Make export_step run the check and refuse to write on failure, so verification cannot be skipped. Add a regression test: a 0.5 mm part must fail dfm_check and must not export.",
    lesson:
      "Anything that must hold has to be enforced by a tool, measured by a checker and tested with a design that is supposed to fail. Instructions in a prompt are preferences.",
  },
  interview: [
    {
      q: "What is the Model Context Protocol and what problem does it solve?",
      a: "MCP is an open protocol from Anthropic, announced in November 2024, for connecting AI applications to tools and data in a standard way. Before it, every application needed a custom integration for every tool. With MCP a server exposes tools, resources and prompts over JSON-RPC 2.0, and any compliant host can discover and use them. The host runs a client per server, and the model sees each tool as a name, a description and an argument schema.",
      level: "screen",
    },
    {
      q: "How does Claude Desktop launch and talk to a local MCP server?",
      a: "You list the server under mcpServers in claude_desktop_config.json with a command and arguments. Claude Desktop starts that command as a subprocess and exchanges newline-delimited JSON-RPC messages over its standard input and output, which is the stdio transport. The client calls initialize, then tools/list, and later tools/call whenever the model wants to run a tool. Because stdout is the protocol channel, the server must never print to it, and logs go to stderr.",
      level: "screen",
    },
    {
      q: "What belongs in a tool's description and schema, and why does it matter?",
      a: "The description says what the tool does, what units it uses and what it will refuse, because the model reads it to decide when and how to call the tool. The schema carries the types and the hard limits, such as thickness at least 1.5 mm, so the model sees them before calling and the server can reject violations before any code runs. Together they act as part of the prompt that cannot be argued with. I write them as carefully as the code, and I include an example of a good call when the arguments are not obvious.",
      level: "screen",
    },
    {
      q: "What are the risks of giving an LLM a tool that runs code, and how would you contain them?",
      a: "The model can run unintended or destructive code, and its arguments can be influenced by untrusted text in documents or web pages. The server runs with your permissions, so the first containment is not to expose a general run_python tool at all and to offer small typed tools instead. If code execution is unavoidable, I run it in a container or a restricted subprocess with a timeout, a memory limit, no network and one writable folder. I also keep per-call approval on during development and review transcripts for what actually ran.",
      level: "screen",
    },
    {
      q: "How would you make an AI-driven CAD tool safe and trustworthy?",
      a: "I would use layers. Typed tools with schema limits and validation reject impossible input with errors that say what to change. A checker such as dfm_check measures the real geometry, and export is gated on it so verification cannot be skipped. The server writes to one folder, restricts names, and caps sizes and run time so a bad request cannot damage the machine or hang it. I would test it with unit tests, the MCP Inspector and a corpus of known-bad designs that must fail, because a checker that has never failed proves nothing. Finally I would keep a human review and a physical prototype for anything that goes to manufacturing.",
      level: "deep",
    },
    {
      q: "A model keeps violating a manufacturing constraint through your tools. How do you fix it?",
      a: "I stop treating it as a prompting problem, because a prompt competes with the user's request and the model will trade the rule away. I move the constraint into the tool: a schema limit so the model sees it up front, validation that returns an actionable error, and a checker that measures the actual geometry. Then I gate the irreversible step, such as export, on that checker passing. I add a regression test with a design that violates the rule, which must fail the check and must not export. After that the model can still try, but it can no longer succeed, and the error text teaches it the limit.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "Which transport does Claude Desktop use to run a local MCP server listed in claude_desktop_config.json?",
      choices: [
        "stdio: it launches the server as a subprocess and exchanges JSON-RPC on stdin and stdout",
        "A WebSocket to a cloud relay",
        "A shared SQLite file",
        "Plain HTTP polling of port 80",
      ],
      answer: 0,
      explain:
        "For local servers the host starts the configured command as a child process and speaks newline-delimited JSON-RPC 2.0 over its standard streams. Streamable HTTP exists for remote servers, but a config entry with a command uses stdio.",
    },
    {
      q: "Your stdio MCP server calls print() for debugging. What happens?",
      choices: [
        "Nothing: print goes to a log file",
        "Claude sees the text as a tool result",
        "The server runs faster",
        "It corrupts the JSON-RPC stream on stdout, so the connection breaks or messages are lost; log to stderr instead",
      ],
      answer: 3,
      explain:
        "Standard output is the protocol channel for stdio servers. Any stray text is parsed as a malformed message. Write diagnostics to stderr, where Claude Desktop captures them in the server's log file.",
    },
    {
      q: "Where is a manufacturing constraint such as minimum wall thickness enforced most reliably?",
      choices: [
        "In the project prompt, written clearly",
        "In the tool schema and a geometric check, with export gated on the check",
        "In the model's training data",
        "In a comment above the tool function",
      ],
      answer: 1,
      explain:
        "A prompt competes with the user's request, so the model can trade the rule away. A schema limit is visible before the call and validated by the server, and a check that measures the geometry cannot be argued with. Gating export on the check makes verification mandatory.",
    },
    {
      q: "In the Python SDK's FastMCP, what happens when a tool function raises ValueError(\"hole_inset must keep the whole hole inside the plate\")?",
      choices: [
        "The server process exits",
        "The exception becomes an isError result whose text carries the message, which the model can read and act on",
        "The error is silently ignored and an empty result is returned",
        "Claude Desktop shows a crash dialog and disables the server",
      ],
      answer: 1,
      explain:
        "FastMCP wraps the exception and the low-level server returns a normal response with isError set to true and the message as text. That is why error messages in tools should say what to change: they are the model's next prompt.",
    },
    {
      q: "Which JSON-RPC method does a client call to find out which tools a server offers?",
      choices: ["tools/call", "resources/list", "initialize", "tools/list"],
      answer: 3,
      explain:
        "tools/list returns each tool's name, description and JSON Schema. initialize only negotiates protocol version and capabilities, and tools/call runs a tool the client already knows about.",
    },
    {
      q: "Why does export_step run dfm_check itself and refuse to write a failing part?",
      choices: [
        "It makes the STEP file smaller",
        "STEP requires a DFM stamp",
        "It makes verification impossible to skip, even if the model never calls dfm_check",
        "It speeds up the kernel",
      ],
      answer: 2,
      explain:
        "If checking is optional the model will sometimes skip it, especially when it is optimising for another goal. Gating the irreversible step on the check turns a good habit into a guarantee.",
    },
    {
      q: "Which test is most valuable for a DFM checker?",
      choices: [
        "A test that a good design passes",
        "A test that the server starts",
        "A test that the JSON is pretty-printed",
        "A set of known-bad designs, such as a 1 mm wall, that must fail",
      ],
      answer: 3,
      explain:
        "A checker that always says pass satisfies every positive test. Negative tests prove it can say no, and they pin the rules down so a refactor cannot quietly weaken them.",
    },
  ],
};

export default data;
