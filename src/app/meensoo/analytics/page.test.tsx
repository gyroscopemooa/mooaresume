import { expect,it,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks=vi.hoisted(()=>({admin:vi.fn(),report:vi.fn()}));
vi.mock('@/server/admin/admin-session',()=>({isAdmin:mocks.admin}));
vi.mock('@/server/analytics/report',()=>({analyticsReport:mocks.report}));
import Page from './page';
it('does not even query cross-user records before the admin gate passes',async()=>{mocks.admin.mockResolvedValue(false);expect(await Page({searchParams:Promise.resolve({})})).toBeNull();expect(mocks.report).not.toHaveBeenCalled();});
it('does not present a failed DB read as zero usage',async()=>{mocks.admin.mockResolvedValue(true);mocks.report.mockRejectedValue(new Error('DB unavailable'));const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({})}));expect(html).toContain('조회할 수 없습니다');expect(html).not.toContain('핵심 결과 재사용 리텐션');});
it('renders cohort maturity, source coverage, platform filters and timeline from a synthetic report',async()=>{
 mocks.admin.mockResolvedValue(true);mocks.report.mockResolvedValue({environment:'development',timezone:'Asia/Seoul',enabled:true,truncated:false,coverage:'관측 최초 코호트',summary:{activated:2,reused:1,funnel:[{event:'session_started',count:3}],retention:[{days:30,eligible:0,returned:0,rate:null}]},revenue:{coverage:'Polar 확정 매출',byCurrency:{},classification:{actual:0,test:0,unclassified:0,free:0}},referral:{converted:0},acquisition:{direct:3},platforms:{web:2,android:1},timeline:[],nextOffset:null});
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({})}));expect(html).toContain('N/A');expect(html).toContain('사용자 여정');expect(html).toContain('android');expect(html).toContain('Polar 확정 매출');
});
