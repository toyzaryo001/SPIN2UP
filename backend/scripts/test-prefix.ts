import { BetflixService } from '../src/services/betflix.service';

async function testPrefix() {
    const rawUser = 'CHKK278187';
    const uplineUser = 'be31kkCHKK278187';

    console.log("Checking balance for raw:", rawUser);
    const bal1 = await BetflixService.getBalance(rawUser);
    console.log("Result:", bal1);

    console.log("Checking balance for upline:", uplineUser);
    const bal2 = await BetflixService.getBalance(uplineUser);
    console.log("Result:", bal2);

    // Test registration again
    console.log("Testing raw register again...");
    const reg1 = await BetflixService.register('0615278187');
    console.log("Register raw result:", reg1);
}

testPrefix();
