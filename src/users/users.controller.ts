import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseInterceptors,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import {
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Protect } from "src/auth/_utils/decorator/protect.decorator";
import { ConnectedUser } from "../_utils/decorators/connecter-user.decorator";
import { UpdateUserDto } from "./_utils/dto/request/update-user.dto";
import { UserDocument } from "./user.schema";
import { UserQueryDto } from "./_utils/dto/request/user-query.dto";
import { UsersMapper } from "./users.mapper";
import { ApiResponsesInterceptor } from "src/_utils/interceptors/api-responses.interceptor";
import { ApiResponseDecorator } from "src/_utils/decorators/api-response.decorator";
import { GetUserDto } from "./_utils/dto/response/get-user.dto";
import { UserByIdPipe } from "src/_utils/pipes/user-by-id.pipe";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersMapper: UsersMapper
  ) {}

  @Protect()
  @UseInterceptors(ApiResponsesInterceptor)
  @Get()
  @ApiOperation({ summary: "Get paginated users." })
  @ApiResponseDecorator(GetUserDto)
  getAllUsers(@Query() queries: UserQueryDto) {
    return this.usersService.findPaginated(queries);
  }

  @Protect()
  @Get("me")
  @ApiOperation({ summary: "Get the current user's information." })
  getCurrentUser(@ConnectedUser() user: UserDocument) {
    return this.usersMapper.toGetUserDto(user);
  }

  @Protect()
  @Get(":userId")
  @ApiParam({ type: "string", name: "userId" })
  @ApiOperation({ summary: "Get a user's information by its ID." })
  getUserById(@Param("userId", UserByIdPipe) user: UserDocument) {
    return this.usersMapper.toGetUserDto(user);
  }

  @Protect()
  @Patch("me")
  @ApiOperation({ summary: "Update the current user." })
  updateUser(
    @ConnectedUser() user: UserDocument,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.usersService.updateUser(user, updateUserDto);
  }

  @Protect()
  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete the current user." })
  @ApiNoContentResponse({ description: "User successfully deleted." })
  deleteUser(@ConnectedUser() connectedUser: UserDocument) {
    return this.usersService.deleteUser(connectedUser);
  }
}
