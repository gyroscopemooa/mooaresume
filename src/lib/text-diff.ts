export type TextDiffPart = { type: "equal" | "added" | "removed"; value: string };

function tokenize(value: string) {
  return value.split(/(\s+|[,.!?;:()[\]{}"'????])/u).filter(Boolean);
}

export function diffText(original: string, revised: string): TextDiffPart[] {
  const left = tokenize(original);
  const right = tokenize(revised);
  const matrix = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));

  for (let row = left.length - 1; row >= 0; row -= 1) {
    for (let column = right.length - 1; column >= 0; column -= 1) {
      matrix[row][column] = left[row] === right[column]
        ? matrix[row + 1][column + 1] + 1
        : Math.max(matrix[row + 1][column], matrix[row][column + 1]);
    }
  }

  const parts: TextDiffPart[] = [];
  const push = (type: TextDiffPart["type"], value: string) => {
    const previous = parts.at(-1);
    if (previous?.type === type) previous.value += value;
    else parts.push({ type, value });
  };
  let row = 0;
  let column = 0;
  while (row < left.length && column < right.length) {
    if (left[row] === right[column]) { push("equal", left[row]); row += 1; column += 1; }
    else if (matrix[row + 1][column] >= matrix[row][column + 1]) { push("removed", left[row]); row += 1; }
    else { push("added", right[column]); column += 1; }
  }
  while (row < left.length) { push("removed", left[row]); row += 1; }
  while (column < right.length) { push("added", right[column]); column += 1; }
  return parts;
}
