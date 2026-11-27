export const ANALYSIS_TIMEOUT_MINUTES = 20;
export const ANALYSIS_TIMEOUT_SECONDS = ANALYSIS_TIMEOUT_MINUTES * 60;

export const ANALYSIS_WAIT_MESSAGE = `첨삭에는 최대 ${ANALYSIS_TIMEOUT_MINUTES}분이 걸릴 수 있습니다. 창을 닫으셔도 계속 진행되며, 결과는 대시보드에 저장됩니다. 서비스 알림을 사용하는 계정에는 확인된 이메일로도 안내합니다.`;
export const PAID_ANALYSIS_WAIT_MESSAGE = `${ANALYSIS_WAIT_MESSAGE} ${ANALYSIS_TIMEOUT_MINUTES}분이 지나도 완료되지 않으면 첨삭 실패로 처리하고 결제 금액을 자동 환불합니다.`;
