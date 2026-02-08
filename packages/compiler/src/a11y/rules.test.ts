import { describe, it, expect } from "vitest";
import ts from "typescript";
import { runA11yChecks } from "./rules";

function check(src: string, level: "strict" | "warn" | "off" = "strict") {
  const sf = ts.createSourceFile(
    "x.tsx",
    src,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  return runA11yChecks(sf, "x.tsx", level);
}

describe("a11y rules", () => {
  it("flags input without accessible name", () => {
    const diags = check("export default () => <input />;");
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].code).toBe("LYRA_A11Y_001");
  });

  it("returns early for non-interactive tags (covers tag filter)", () => {
    const diags = check("export default () => <div />;");
    // Should return no diagnostics because <div> is not in the interactive set
    expect(diags.length).toBe(0);
  });

  it('handles attribute without initializer (covers : "")', () => {
    const diags = check("export default () => <input aria-label />;");
    // Attribute exists but has no value; initializer is undefined
    expect(diags.length).toBe(0); // no error, because aria-label is present
  });

  it('sets severity to "warn" when level="warn" (covers ternary else branch)', () => {
    const diags = check("export default () => <input />;", "warn");
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].severity).toBe("warn"); // <-- covers "error" : "warn"
  });
});

describe("LYRA_A11Y_002: img alt", () => {
  it("flags <img /> without alt", () => {
    const diags = check('export default () => <img src="/logo.png" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_002")).toBe(true);
  });

  it("passes <img alt='photo' />", () => {
    const diags = check('export default () => <img alt="photo" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_002")).toBe(false);
  });

  it("passes <img aria-label='photo' />", () => {
    const diags = check('export default () => <img aria-label="photo" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_002")).toBe(false);
  });

  it("passes <img aria-labelledby='id1' />", () => {
    const diags = check('export default () => <img aria-labelledby="id1" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_002")).toBe(false);
  });

  it("passes decorative <img alt='' />", () => {
    const diags = check('export default () => <img alt="" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_002")).toBe(false);
  });
});

describe("LYRA_A11Y_003: button text", () => {
  it("flags empty <button></button>", () => {
    const diags = check("export default () => <button></button>;");
    expect(diags.some((d) => d.code === "LYRA_A11Y_003")).toBe(true);
  });

  it("flags whitespace-only <button> </button>", () => {
    const diags = check("export default () => <button>   </button>;");
    expect(diags.some((d) => d.code === "LYRA_A11Y_003")).toBe(true);
  });

  it("flags self-closing <button />", () => {
    const diags = check("export default () => <button />;");
    expect(diags.some((d) => d.code === "LYRA_A11Y_003")).toBe(true);
  });

  it("passes <button>Click me</button>", () => {
    const diags = check("export default () => <button>Click me</button>;");
    expect(diags.some((d) => d.code === "LYRA_A11Y_003")).toBe(false);
  });

  it('passes <button aria-label="Close"></button>', () => {
    const diags = check(
      'export default () => <button aria-label="Close"></button>;',
    );
    expect(diags.some((d) => d.code === "LYRA_A11Y_003")).toBe(false);
  });

  it("passes <button>{text}</button> with expression child", () => {
    const diags = check("export default () => <button>{text}</button>;");
    expect(diags.some((d) => d.code === "LYRA_A11Y_003")).toBe(false);
  });

  it("passes <button><span>icon</span></button> with element child", () => {
    const diags = check(
      "export default () => <button><span>icon</span></button>;",
    );
    expect(diags.some((d) => d.code === "LYRA_A11Y_003")).toBe(false);
  });
});

describe("LYRA_A11Y_004: form label association", () => {
  it('flags <input id="name" /> with no matching label', () => {
    const diags = check('export default () => <input id="name" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_004")).toBe(true);
  });

  it("passes when matching <label htmlFor> exists", () => {
    const diags = check(
      'export default () => <><label htmlFor="name">Name</label><input id="name" /></>;',
    );
    expect(diags.some((d) => d.code === "LYRA_A11Y_004")).toBe(false);
  });

  it('passes when matching <label for="..."> exists (for fallback)', () => {
    const diags = check(
      'export default () => <><label for="email">Email</label><input id="email" /></>;',
    );
    expect(diags.some((d) => d.code === "LYRA_A11Y_004")).toBe(false);
  });

  it("handles <label> without for or htmlFor attribute", () => {
    // Label without for/htmlFor — the htmlFor ?? for path evaluates to undefined
    const diags = check(
      'export default () => <><label>Name</label><input id="name" /></>;',
    );
    // Should flag the input because no matching label exists
    expect(diags.some((d) => d.code === "LYRA_A11Y_004")).toBe(true);
  });

  it("passes when aria-label is present", () => {
    const diags = check(
      'export default () => <input id="name" aria-label="Name" />;',
    );
    expect(diags.some((d) => d.code === "LYRA_A11Y_004")).toBe(false);
  });

  it("passes when aria-labelledby is present", () => {
    const diags = check(
      'export default () => <input id="name" aria-labelledby="lbl" />;',
    );
    expect(diags.some((d) => d.code === "LYRA_A11Y_004")).toBe(false);
  });

  it("flags <select> with id but no label", () => {
    const diags = check('export default () => <select id="color"></select>;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_004")).toBe(true);
  });

  it("flags <textarea> with id but no label", () => {
    const diags = check('export default () => <textarea id="bio"></textarea>;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_004")).toBe(true);
  });
});

describe("LYRA_A11Y_005: anchor href", () => {
  it("flags <a> without href", () => {
    const diags = check("export default () => <a>Link</a>;");
    expect(diags.some((d) => d.code === "LYRA_A11Y_005")).toBe(true);
  });

  it('passes <a href="/page">Link</a>', () => {
    const diags = check('export default () => <a href="/page">Link</a>;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_005")).toBe(false);
  });

  it("passes self-closing <a /> with href", () => {
    const diags = check('export default () => <a href="#" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_005")).toBe(false);
  });

  it("flags self-closing <a /> without href", () => {
    const diags = check("export default () => <a />;");
    expect(diags.some((d) => d.code === "LYRA_A11Y_005")).toBe(true);
  });
});

describe("LYRA_A11Y_006: tabindex positive", () => {
  it("flags tabIndex > 0", () => {
    const diags = check('export default () => <div tabIndex="5" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_006")).toBe(true);
  });

  it("passes tabIndex=0", () => {
    const diags = check('export default () => <div tabIndex="0" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_006")).toBe(false);
  });

  it("passes tabIndex=-1", () => {
    const diags = check('export default () => <div tabIndex="-1" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_006")).toBe(false);
  });

  it("flags tabindex > 0 (lowercase)", () => {
    const diags = check('export default () => <div tabindex="3" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_006")).toBe(true);
  });
});

describe("LYRA_A11Y_007: empty headings", () => {
  it("flags empty <h1></h1>", () => {
    const diags = check("export default () => <h1></h1>;");
    expect(diags.some((d) => d.code === "LYRA_A11Y_007")).toBe(true);
  });

  it("flags whitespace-only <h2>   </h2>", () => {
    const diags = check("export default () => <h2>   </h2>;");
    expect(diags.some((d) => d.code === "LYRA_A11Y_007")).toBe(true);
  });

  it("passes <h1>Title</h1>", () => {
    const diags = check("export default () => <h1>Title</h1>;");
    expect(diags.some((d) => d.code === "LYRA_A11Y_007")).toBe(false);
  });

  it("passes <h3>{dynamic}</h3>", () => {
    const diags = check("export default () => <h3>{title}</h3>;");
    expect(diags.some((d) => d.code === "LYRA_A11Y_007")).toBe(false);
  });

  it('passes <h1 aria-label="title"></h1>', () => {
    const diags = check('export default () => <h1 aria-label="title"></h1>;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_007")).toBe(false);
  });

  it("flags empty <h6></h6>", () => {
    const diags = check("export default () => <h6></h6>;");
    expect(diags.some((d) => d.code === "LYRA_A11Y_007")).toBe(true);
  });
});

describe("hasChildContent fallback branch", () => {
  it("returns false for uncommon JSX child types (JsxFragment)", () => {
    // A fragment <></> inside a button is a JsxFragment child — not covered
    // by isJsxText/isJsxExpression/isJsxElement/isJsxSelfClosingElement
    const diags = check("export default () => <button><></></button>;");
    // Fragment is not recognized as content by hasChildContent, so it flags
    expect(diags.some((d) => d.code === "LYRA_A11Y_003")).toBe(true);
  });
});

describe("getAttributes: spread attributes", () => {
  it("skips JsxSpreadAttribute in attribute collection", () => {
    const diags = check(
      'export default () => <input {...props} aria-label="ok" />;',
    );
    // aria-label is present, so no LYRA_A11Y_001
    expect(diags.some((d) => d.code === "LYRA_A11Y_001")).toBe(false);
  });
});

describe("LYRA_A11Y_008: iframe title", () => {
  it("flags <iframe /> without title", () => {
    const diags = check('export default () => <iframe src="/embed" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_008")).toBe(true);
  });

  it('passes <iframe title="Map" />', () => {
    const diags = check('export default () => <iframe title="Map" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_008")).toBe(false);
  });

  it('passes <iframe aria-label="Map" />', () => {
    const diags = check('export default () => <iframe aria-label="Map" />;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_008")).toBe(false);
  });

  it("flags <iframe> without title (opening element)", () => {
    const diags = check('export default () => <iframe src="/embed"></iframe>;');
    expect(diags.some((d) => d.code === "LYRA_A11Y_008")).toBe(true);
  });
});
