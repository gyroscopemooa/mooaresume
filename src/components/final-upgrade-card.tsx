import Link from "next/link";
import { ArrowRight, MessageCircleMore, Sparkles } from "lucide-react";
import styles from "./final-upgrade-card.module.css";

export function FinalUpgradeCard({ product }: { product: "QUICK" | "PRO" | "FINAL" }) {
  // Nothing above FINAL to point at. An upsell card on the top tier reads as a
  // charge for something the applicant already bought.
  if (product === "FINAL") return null;
  if (product === "QUICK") {
    return <section className={styles.card}>
      <div className={styles.icon}><MessageCircleMore /></div>
      <div>
        <span>{"\uB354 \uC815\uAD50\uD55C PRO \uBD84\uC11D"}</span>
        <h2>{"\uC774\uB825\uC11C\uC640 \uCD94\uAC00 \uC790\uB8CC\uB97C \uB354\uD558\uBA74, \uC18C\uC7AC\uAE4C\uC9C0 \uB2E4\uC2DC \uC124\uACC4\uD560 \uC218 \uC788\uC5B4\uC694."}</h2>
        <p>{"QUICK\uC740 \uD604\uC7AC \uC790\uAE30\uC18C\uAC1C\uC11C \uC548\uC758 \uC0AC\uC2E4\uC744 \uC815\uB9AC\uD569\uB2C8\uB2E4. PRO\uC5D0\uC11C\uB294 \uC774\uB825\uC11C\u00B7\uACBD\uB825\uAE30\uC220\uC11C\u00B7\uC790\uACA9\uC99D\u00B7\uD504\uB85C\uC81D\uD2B8 \uC790\uB8CC\uB85C \uC0C8 \uC18C\uC7AC\uB97C \uCC3E\uACE0 \uBB38\uD56D\uC5D0 \uB9DE\uAC8C \uBC30\uCE58\uD569\uB2C8\uB2E4."}</p>
        <ul><li><Sparkles/>{"\uD655\uC778\uB41C \uC774\uB825\uC11C \uC0AC\uC2E4\uB85C \uC18C\uC7AC \uBCF4\uAC15"}</li><li><Sparkles/>{"\uBE44\uC5B4 \uC788\uAC70\uB098 \uC57D\uD55C \uBB38\uD56D\uC5D0 \uC0AC\uB840 \uBC30\uCE58"}</li><li><Sparkles/>{"\uCC44\uC6A9\uACF5\uACE0\uC640 \uACBD\uD5D8 \uADFC\uAC70 \uC5F0\uACB0"}</li></ul>
      </div>
      <aside><small>{"PRO \uC815\uBCF4 \uC785\uB825"}</small><strong>{"\uB354 \uC815\uBC00\uD558\uAC8C"}</strong><em>{"\uCD94\uAC00 \uC790\uB8CC\uB85C \uC0C8\uB85C \uBD84\uC11D"}</em><Link href="/onboarding?from=quick-upgrade">{"PRO\uB85C \uB354 \uC815\uBC00\uD558\uAC8C"} <ArrowRight/></Link></aside>
    </section>;
  }

  return <section className={styles.card}>
    <div className={styles.icon}><MessageCircleMore /></div>
    <div><span>FINAL</span><h2>{"\uC644\uC131\uB41C \uC9C0\uC6D0\uC11C\uB85C \uBAA8\uC758\uBA74\uC811\uAE4C\uC9C0 \uC774\uC5B4\uAC00\uBCF4\uC138\uC694."}</h2><p>{"PRO \uACB0\uACFC\uC758 \uC608\uC0C1 \uC9C8\uBB38\uC744 \uBC14\uD0D5\uC73C\uB85C \uB2F5\uBCC0 \uAC00\uC774\uB4DC\uC640 \uBCF4\uC644 \uD3EC\uC778\uD2B8\uB97C \uC81C\uACF5\uD569\uB2C8\uB2E4."}</p></div>
  </section>;
}
