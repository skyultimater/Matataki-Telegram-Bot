import { inject } from "inversify";
import { Chat } from "telegraf/typings/telegram-types";

import { Scheduler, InjectRepository } from "../decorators";
import { IScheduler } from "./IScheduler";
import { Injections } from "../constants";
import { BotService, MatatakiService, Web3Service } from "../services";
import { Group, User } from "../entities";
import { GroupRepository } from "../repositories";

@Scheduler("0 */1 * * * *")
export class GroupMemberChecker implements IScheduler {
    constructor(
        @inject(Injections.BotService) private botService: BotService,
        @inject(Injections.Web3Service) private web3Service: Web3Service,
        @inject(Injections.MatatakiService) private matatakiService: MatatakiService,
        @InjectRepository(Group) private groupRepo: GroupRepository) {
    }

    async onTick() {
        if (!this.botService.isRunning) {
            return;
        }

        const groups = await this.groupRepo.getGroups();
        for (const group of groups) {
            const groupId = Number(group.id);
            const balanceRequirement = group.requirement.minetoken?.amount ?? 0;

            let groupInfo: Chat;
            try {
                groupInfo = await this.botService.getGroupInfo(group);
            } catch {
                console.warn("The bot was kicked");
                await this.groupRepo.setActive(group, false);
                continue;
            }

            const contractAddress = await this.matatakiService.getContractAddressOfMinetoken(group.tokenId);

            const kickedUsers = new Array<User>();

            for (const user of group.members) {
                const userId = Number(user.id);

                const userInfo = await this.botService.getMember(groupId, userId);
                if (userInfo.status !== "member") {
                    kickedUsers.push(user);
                    continue;
                }

                const walletAddress = await this.matatakiService.getEthWallet(userId);;
                const balance = await this.web3Service.getBalance(contractAddress, walletAddress);

                if (balance >= balanceRequirement) {
                    continue;
                }

                try {
                    await this.botService.kickMember(groupId, userId);
                    await this.botService.sendMessage(userId, `你现在的 Fan 票不满足群 ${groupInfo.title} 的条件，现已被移出`);

                    kickedUsers.push(user);
                } catch {
                    console.warn("机器人没有权限");
                }
            }

            if (kickedUsers.length === 0) {
                return;
            }

            await this.groupRepo.removeMembers(group, kickedUsers);
        }
    }
}
