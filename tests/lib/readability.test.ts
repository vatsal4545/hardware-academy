import { describe, it, expect } from "vitest";
import {
  averageSentenceLength,
  countWords,
  jsxToText,
  missingSentences,
  splitSentences,
  textBlocks,
  theorySectionSource,
} from "@/lib/readability";

describe("countWords", () => {
  it("counts tokens with a letter or a digit and skips bare symbols", () => {
    expect(countWords("Silicon's gap is 1.12 eV — about 9× smaller.")).toBe(8);
  });
});

describe("splitSentences", () => {
  it("splits after . ! ? followed by a space and keeps decimals whole", () => {
    expect(splitSentences("Silicon's gap is 1.12 eV. Glass is about 9 eV! Why? Heat.")).toEqual([
      "Silicon's gap is 1.12 eV.",
      "Glass is about 9 eV!",
      "Why?",
      "Heat.",
    ]);
  });

  it("drops pieces without a word", () => {
    expect(splitSentences("One. ... Two.")).toEqual(["One.", "Two."]);
  });
});

describe("averageSentenceLength", () => {
  it("averages words per sentence over all blocks together", () => {
    expect(averageSentenceLength(["One two three. Four five.", "Six."])).toBe(2);
  });

  it("is 0 when there is no sentence", () => {
    expect(averageSentenceLength([])).toBe(0);
  });
});

describe("jsxToText", () => {
  it("drops tags, attributes and comments and resolves spacers and entities", () => {
    const source = `<p className="x">The <strong>hole</strong>{" "}moves.{/* note */} Silicon&apos;s gap.</p>`;
    expect(jsxToText(source)).toBe("The hole moves. Silicon's gap.");
  });

  it("re-attaches punctuation that a tag separates from its word", () => {
    expect(jsxToText(`<p>Run <code>make</code>. Then ( <em>wait</em> ).</p>`)).toBe("Run make. Then (wait).");
  });
});

describe("theorySectionSource and missingSentences", () => {
  const before = `
    <Section id="theory" title="Old title">
      <Prose><p>Silicon has atomic number 14. Every bond holds two electrons.</p></Prose>
    </Section>
    <Section id="viz" title="Play">
      <p>Things to try in the old viz section.</p>
    </Section>`;

  it("takes only the content of the theory section", () => {
    expect(jsxToText(theorySectionSource(before))).toBe("Silicon has atomic number 14. Every bond holds two electrons.");
  });

  it("lists old sentences of four or more words that the new source lost", () => {
    const after = `<ConceptStep n={1} title="New" deeper={<p>Silicon has atomic number 14.</p>}><p>Atoms share electrons.</p></ConceptStep>`;
    expect(missingSentences(before, after)).toEqual(["Every bond holds two electrons."]);
  });

  it("finds nothing missing when the old text moved word for word", () => {
    const after = `<ConceptStep n={1} title="New" deeper={<Prose><p>Silicon has atomic number 14. Every bond holds two electrons.</p></Prose>}>
      <p>Atoms share electrons.</p>
    </ConceptStep>`;
    expect(missingSentences(before, after)).toEqual([]);
  });

  it("checks block by block, so a table and the heading after it can move into different steps", () => {
    const old = `<Section id="theory" title="T"><Prose>
      <table><tbody><tr><td>Silicon carbide in fast chargers</td></tr></tbody></table>
      <h3>Temperature rules everything here</h3>
      <p>Leakage doubles every ten degrees.</p>
    </Prose></Section><Section id="viz" title="V"></Section>`;
    const moved = `
      <ConceptStep n={3} title="A" deeper={<table><tbody><tr><td>Silicon carbide in fast chargers</td></tr></tbody></table>}><p>Simple.</p></ConceptStep>
      <ConceptStep n={4} title="B" deeper={<><h4>Temperature rules everything here</h4><p>Leakage doubles every ten degrees.</p></>}><p>Simple.</p></ConceptStep>`;
    expect(textBlocks(theorySectionSource(old))).toEqual([
      "Silicon carbide in fast chargers",
      "Temperature rules everything here",
      "Leakage doubles every ten degrees.",
    ]);
    expect(missingSentences(old, moved)).toEqual([]);
  });

  it("ignores code markup when the words are unchanged", () => {
    const old = `<Section id="theory" title="T"><Prose><p>Always run <code>make test</code> first.</p></Prose></Section><Section id="viz" title="V"></Section>`;
    const after = `<ConceptStep n={1} title="New" deeper={<p>Always run make test first.</p>}><p>Simple.</p></ConceptStep>`;
    expect(missingSentences(old, after)).toEqual([]);
  });
});
