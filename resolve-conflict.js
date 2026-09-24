const fs = require('fs');

// 1) result-workspace-complete.tsx: keep Codex's 초과/부족/충족 status logic,
//    layer this fix's paragraph-per-<p> rendering + normalized copy text on top.
const tsxPath = 'src/components/result-workspace-complete.tsx';
let tsx = fs.readFileSync(tsxPath, 'utf8');

const mergedFinalSection = '{view === "final" && <section className={styles.final}><header><div><span className={styles.eyebrow}>제출용 최종 문장</span><h2>최종 첨삭본</h2><p>비교와 피드백을 제외하고 복사·제출할 답변만 모았습니다.</p></div><div><button onClick={() => sampleBlocked() || copy("all",finalText)}>{copied === "all" ? <Check/> : <Clipboard/>}{copied === "all" ? "복사됨" : "전체 복사"}</button><button onClick={() => sampleBlocked() || downloadDocx()}><Download/> DOCX 저장</button><button onClick={() => sampleBlocked() || download()}><Download/> TXT 저장</button></div></header><div className={styles.finalDocument}>{result.questions.map((question) => {const answer=answers[question.id]??question.revisedAnswer;const copyId=`final-${question.id}`;const answerLength=countCompactCharacters(answer);const difference=answerLength-question.targetLength;const lengthStatus=difference > 0 ? ` · ${difference}자 초과` : difference < 0 ? ` · ${Math.abs(difference)}자 부족` : " · 분량 충족";return <article key={question.id}><span>{String(question.order).padStart(2,"0")}</span><div><div className={styles.finalQuestionHead}><h3>{resolveQuestionTitle(question)}</h3><button onClick={() => copy(copyId,normalizeAnswerParagraphs(answer))}>{copied === copyId ? <Check/> : <Clipboard/>}{copied === copyId ? "복사됨" : "이 문항 복사"}</button></div>{question.subheading && <p className={styles.subheading}><b>소제목 제안</b>{question.subheading}</p>}<div className={styles.finalBody}>{splitIntoParagraphs(answer).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><small data-short={difference < 0 ? "true" : undefined} data-over={difference > 0 ? "true" : undefined}>공백 제외 {answerLength} / {question.targetLength}자{lengthStatus}</small></div></article>})}</div>{isFilledResult && <p className={styles.filledNotice}><AlertCircle/><span><b>비어 있던 부분을 채운 제안이 포함되어 있습니다.</b> 어디를 채웠는지는 <b>문항별 첨삭</b>에서 색으로 확인할 수 있습니다. 제출 전에 사실과 맞는지 확인해 주세요.</span></p>}<footer><CheckCircle2/><p><b>이 화면의 문장이 복붙용 최종 첨삭본입니다.</b> 문항별 첨삭에서 직접 고친 내용도 여기에 자동 반영됩니다.</p><span>DOCX는 한글(HWP)에서도 바로 열립니다 · PDF 내보내기 예정</span></footer></section>}';

const conflictRegex = /<<<<<<< HEAD[\s\S]*?>>>>>>> 75ad11d[^\n]*\n?/;
if (conflictRegex.test(tsx)) {
  tsx = tsx.replace(conflictRegex, mergedFinalSection + '\n');
  tsx = tsx.replace('countCharactersWithWhitespace, ', '');
  fs.writeFileSync(tsxPath, tsx, 'utf8');
  console.log('OK: result-workspace-complete.tsx conflict resolved');
} else {
  console.log('SKIP: no conflict markers found in result-workspace-complete.tsx (already resolved?)');
}

// 2) agent-change-log.md: both sides only added entries at the top, so just
//    drop the three marker lines and keep everything from both sides.
const logPath = 'docs/agent-change-log.md';
let log = fs.readFileSync(logPath, 'utf8');
const before = log;
log = log
  .split('\n')
  .filter((line) => !/^<<<<<<< HEAD\s*$/.test(line) && !/^=======\s*$/.test(line) && !/^>>>>>>> 75ad11d/.test(line))
  .join('\n');
if (log !== before) {
  fs.writeFileSync(logPath, log, 'utf8');
  console.log('OK: agent-change-log.md conflict markers removed');
} else {
  console.log('SKIP: no conflict markers found in agent-change-log.md (already resolved?)');
}
