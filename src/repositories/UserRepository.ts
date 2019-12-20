import { Repository } from "../decorators";
import { User } from "../entities";
import { IUserRepository } from "../definitions";
import { BaseRepository } from "./BaseRepository";

@Repository(User)
export class UserRepository extends BaseRepository<User> implements IUserRepository {
    constructor() {
        super(User);
    }

    async addUser(id: number): Promise<User> {
        let user = await this.repository.findOne(id);
        if (user) {
            return user;
        }

        user = this.repository.create();
        user.id = id;

        await this.repository.save(user);

        return user;
    }
}
