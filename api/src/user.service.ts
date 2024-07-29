import { Injectable } from '@nestjs/common'
import { LoginModel, User } from './app.models'
import { UserBuilder } from './app.builders'
import { EntityService } from './entity.service'

@Injectable()
export class UserService extends EntityService<User, UserBuilder> {
  getBuilder(entity: User): UserBuilder {
    return new UserBuilder(entity)
  }

  login(data: LoginModel): User {
    const user: User = {
      id: this.findUniqueId(),
      key: this.findUniqueKey(),
      username: data.username,
    }

    this.add(user)

    return user
  }
}
