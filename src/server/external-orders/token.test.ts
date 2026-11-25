import {describe,it,expect} from "vitest";
import {externalOrderToken,verifyExternalOrderToken} from "./token";
const id="e9928862-13e4-4a5c-a707-76d9f43073ba",version="5d153f80-e232-4146-8b51-435026fc8d57",key="a".repeat(40);
describe("external result links",()=>{
 it("binds order and version",()=>{const token=externalOrderToken(id,version,key);expect(verifyExternalOrderToken(token,key)).toEqual({id,version});expect(verifyExternalOrderToken(token,"b".repeat(40))).toBeNull();expect(verifyExternalOrderToken(token.replace(version,id),key)).toBeNull();});
 it("rejects malformed and weak-key grants",()=>{expect(verifyExternalOrderToken("bad",key)).toBeNull();expect(()=>externalOrderToken(id,version,"weak")).toThrow();});
});
