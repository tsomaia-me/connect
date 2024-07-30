import { Injectable } from '@nestjs/common'
import { LoginModel, User } from './app.models'
import { UserBuilder } from './app.builders'
import { EntityService } from './entity.service'

@Injectable()
export class UserService extends EntityService<User, UserBuilder> {
  getSourceFilePath(): string {
    return 'data/users.json'
  }

  getBuilder(entity: User): UserBuilder {
    return new UserBuilder(entity)
  }

  async login(data: LoginModel): Promise<User> {
    const user: User = {
      id: this.findUniqueId(),
      key: this.findUniqueKey(),
      username: data.username,
    }

    await this.add(user)

    return user
  }
}
