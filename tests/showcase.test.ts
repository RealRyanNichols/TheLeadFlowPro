import {test} from "node:test";
import assert from "node:assert/strict";
import {showcaseData,forecast,type ModelInput} from "../lib/showcaseData";
test("client showcase rejects agency economics, proposals, CPL and private source data",()=>{
  const raw={generatedAt:"2026-10-07T01:00:00Z",viewer:{name:"PRIVATE_NAME"},tools:{url:"PRIVATE_URL"},proposalPlanner:{metrics:{shared:2},proposals:[{company:"PRIVATE_COMPANY",phone:"PRIVATE_PHONE",email:"PRIVATE_EMAIL"}],valueTotals:{openCents:987654321,sharedOpenCents:123456789}},clientCampaigns:{brands:{leadflow:{windows:{"28":{status:"available",totals:{leads:62,spend:2189.6,cpl:35.316129,cac:9999}}}},premier:{label:"PRIVATE_COMPANY",windows:{"28":{status:"available",totals:{cac:200,cpl:3,spend:4000}}}},scott:{windows:{"28":{status:"blocked",totals:{cac:500,cpl:25}}}}}},finance:{mrr:654321,profit:345678,ownerRows:[{name:"PRIVATE_NAME"}]}};
  const x=showcaseData(raw);assert.deepEqual(x,{asOf:"2026-10-07T01:00:00Z",clientMetrics:{dirt:{cpa:null},education:{cpa:200}}});
  for(const value of ["PRIVATE_","987654321","123456789","654321","345678","35.316129","9999","proposal","agency","cpl","leads","spend"])assert.ok(!JSON.stringify(x).includes(value),value);
});
const base:ModelInput={investment:8500,targetUnits:16,ticket:4500,margin:40,repeat:8,capacity:48};
test("customer cost per job excludes repeat jobs from acquisition count",()=>{const x=forecast("dirt",base);assert.equal(x.units,16);assert.equal(x.totalJobs,24);assert.equal(x.acquisitionCost,8500/16);assert.equal(x.revenue,108000);assert.equal(x.contribution,34700);});
test("education acquisition uses whole enrollments within available seats",()=>{const x=forecast("education",{...base,investment:2500,targetUnits:5,ticket:3000,capacity:2});assert.equal(x.units,2);assert.equal(x.totalJobs,2);assert.equal(x.revenue,6000);assert.equal(x.acquisitionCost,1250);});
test("empty and losing customer scenarios never invent results or divide by zero",()=>{const x=forecast("dirt",{...base,targetUnits:0});assert.equal(x.units,0);assert.equal(x.totalJobs,0);assert.equal(x.roi,-100);assert.equal(x.acquisitionCost,null);const y=forecast("dirt",{...base,ticket:500,margin:5,capacity:1});assert.ok(y.contribution<0);assert.equal(forecast("education",{...base,investment:0}).roi,null);});
