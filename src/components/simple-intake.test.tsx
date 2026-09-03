// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import JSZip from "jszip";
import { SimpleIntake } from "./simple-intake";
import type { SimpleIntakeFile } from "./simple-intake";

/**
 * 첨부가 조용히 실패하던 자리.
 *
 * 자격증을 압축해서 올린 사람이 "아무 일도 일어나지 않는" 화면을 봤습니다.
 * 압축파일 안이 전부 사진이면 읽을 것이 없는데, 그 사실이 어디에도 나오지
 * 않았고, 같이 고른 다른 파일까지 함께 사라졌습니다.
 */

async function zipOf(name: string, entries: Record<string, string>) {
  const zip = new JSZip();
  for (const [entry, body] of Object.entries(entries)) zip.file(entry, body);
  return new File([await zip.generateAsync({ type: "blob" })], name);
}

// 정리하지 않으면 앞 테스트가 마운트된 채로 남고, 다음 테스트가 그쪽
// 입력창을 집습니다. 실제로 그렇게 한 번 속았습니다.
afterEach(cleanup);

function renderIntake() {
  const files: SimpleIntakeFile[] = [];
  const onFilesChange = vi.fn();
  const view = render(
    <SimpleIntake
      draft="" onDraftChange={vi.fn()}
      targetLength="700" onTargetLengthChange={vi.fn()}
      resolvedLengths="" lengthPlans={[]} lengthLoss={null}
      limitCharacters={10_000}
      files={files} onFilesChange={onFilesChange}
      onError={vi.fn()}
    />,
  );
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { input, onFilesChange, view };
}

describe("간편 입력 첨부", () => {
  it("사진만 든 압축파일은 왜 안 되는지 화면에 남긴다", async () => {
    // 예전에는 여기서 아무 흔적도 남지 않았습니다.
    const { input, view } = renderIntake();

    fireEvent.change(input, { target: { files: [await zipOf("자격증.zip", { "기능사.jpg": "binary", "산업기사.png": "binary" })] } });

    expect(await within(view.container).findByText(/넣지 못한 파일/)).toBeTruthy();
    await waitFor(() => expect(view.container.textContent).toMatch(/자격증\.zip/));
  });

  it("압축파일 하나가 넘어져도 같이 고른 파일은 남는다", async () => {
    // 하나 때문에 전부 잃으면, 손님은 무엇이 문제였는지 모른 채 처음부터
    // 다시 골라야 합니다.
    const { input, onFilesChange } = renderIntake();

    fireEvent.change(input, { target: { files: [
      new File(["품질 업무를 3년 했습니다"], "이력서.txt"),
      await zipOf("자격증.zip", { "기능사.jpg": "binary" }),
    ] } });

    await waitFor(() => expect(onFilesChange).toHaveBeenCalled());
    const added = onFilesChange.mock.calls.at(-1)?.[0] as SimpleIntakeFile[];
    expect(added.map((file) => file.filename)).toContain("이력서.txt");
  });

  it("압축파일이 지나친 항목을 이름으로 밝힌다", async () => {
    // 읽은 것만 보여 주고 나머지를 말하지 않으면, 올린 사람은 다 들어간 줄
    // 압니다.
    const { input, view, onFilesChange } = renderIntake();

    fireEvent.change(input, { target: { files: [
      await zipOf("자료.zip", { "경력기술서.txt": "에이텍 재직", "자격증사진.jpg": "binary" }),
    ] } });

    // 읽은 것은 들어가고,
    await waitFor(() => expect(onFilesChange).toHaveBeenCalled());
    expect((onFilesChange.mock.calls.at(-1)?.[0] as SimpleIntakeFile[]).map((file) => file.filename))
      .toContain("경력기술서.txt");
    // 지나친 것은 이름으로 남습니다.
    await waitFor(() => expect(view.container.textContent).toMatch(/자격증사진\.jpg/));
  });
});
