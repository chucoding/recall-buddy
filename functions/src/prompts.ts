/**
 * 플래시카드용 AI 시스템 프롬프트 (Clova/OpenAI 공통)
 * 클라이언트에 노출되지 않도록 서버에서만 사용
 */
export type ContentType = "markdown" | "code-diff";

const OUTPUT_FORMAT =
  "질문은 다음과 같은 형식으로 출력해주세요. [\"첫 번째 질문\", \"두 번째 질문\", ...]";

export function getFlashcardPrompt(contentType: ContentType): string {
  return contentType === "markdown"
    ? `마크다운 파일을 읽고 질문을 만들어주세요. ${OUTPUT_FORMAT}`
    : `코드 변경 내용(diff)을 보고 질문을 만들어주세요. 변경된 코드의 목적, 동작, 영향 등에 대해 물어보세요. ${OUTPUT_FORMAT}`;
}
