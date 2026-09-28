import type {AnalyticsEvent} from "./schema";
/** No payload: application code cannot accidentally pass document text. */
export function observeAnalytics(eventName:AnalyticsEvent["eventName"]) {
  if(typeof window!=="undefined" && process.env.NEXT_PUBLIC_ANALYTICS_ENABLED==="true") {
    window.dispatchEvent(new CustomEvent("mooa-analytics-observation",{detail:eventName}));
  }
}
