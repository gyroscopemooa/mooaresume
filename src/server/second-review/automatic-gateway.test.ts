import { describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { AutomaticReviewGateway } from "./automatic-gateway";
describe("automatic review wire contract",()=>{
  it("starts bounded structured background calls with separate instructions",async()=>{
    const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:"resp_test",status:"queued",model:"fixture"})));
    const gateway=new AutomaticReviewGateway("test-key","fixture",transport);
    await gateway.start("draft",{units:[]});
    const first=JSON.parse(transport.mock.calls[0][1].body);
    expect(first.background).toBe(true);
    expect(first.text.format.strict).toBe(true);
    expect(first.max_output_tokens).toBe(24000);
    expect(first.text.format.schema.additionalProperties).toBe(false);
    expect(first.instructions).toContain("근무처별 업무를 섞지");
    transport.mockResolvedValue(new Response(JSON.stringify({id:"resp_verify",status:"queued",model:"fixture"})));
    await gateway.start("verify",{});
    expect(JSON.parse(transport.mock.calls[1][1].body).instructions).toContain("작성자와 별개");
  });
  it("never follows an arbitrary URL for polling",async()=>{
    const transport=vi.fn();
    await expect(new AutomaticReviewGateway("key","model",transport).poll("https://example.com")).rejects.toThrow("INVALID_RESPONSE");
    expect(transport).not.toHaveBeenCalled();
  });
  it("reads completion usage and does not accept incomplete output",async()=>{
    const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:"resp_test",status:"completed",model:"fixture",output:[{content:[{type:"output_text",text:'{"approved":true}'}]}],usage:{total_tokens:100}})));
    const gateway=new AutomaticReviewGateway("key","model",transport);
    expect(await gateway.poll("resp_test")).toEqual(expect.objectContaining({status:"completed",output:{approved:true},execution:expect.objectContaining({usage:{total_tokens:100}})}));
    transport.mockResolvedValue(new Response(JSON.stringify({id:"resp_test",status:"incomplete"})));
    expect(await gateway.poll("resp_test")).toEqual({status:"failed"});
  });
});
