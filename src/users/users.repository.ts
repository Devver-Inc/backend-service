import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model } from "mongoose";
import { User, UserDocument } from "./user.schema";
import { CreateUserDto } from "./_utils/dto/request/create-user.dto";
import { randomStringGenerator } from "@nestjs/common/utils/random-string-generator.util";
import { UpdateUserDto } from "./_utils/dto/request/update-user.dto";
import { UserQueryDto } from "./_utils/dto/request/user-query.dto";

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(body: CreateUserDto) {
    const user = new this.userModel({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      password: body.password,
    });
    return user.save();
  }

  findOneById = (userId: string) => this.userModel.findById(userId).exec();

  findOneByIdOrThrow = (userId: string) =>
    this.userModel.findById(userId).orFail().exec();

  findOneByEmailOrThrow = (email: string) =>
    this.userModel
      .findOne({
        email: { $regex: new RegExp(`^${email}$`, "i") },
        deletedAt: null,
      })
      .orFail()
      .exec();

  async findPaginated(queries: UserQueryDto) {
    const { search, limit, orderBy, role, skip, order } = queries;

    const queryParams: FilterQuery<UserDocument> = {
      deletedAt: null,
      ...(search && {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }),
      ...(role && { role }),
    };

    const sortOrder = order === "asc" ? 1 : -1;

    const [users, totalCount] = await Promise.all([
      this.userModel
        .find(queryParams)
        .limit(limit)
        .skip(skip)
        .sort({ [orderBy]: sortOrder })
        .exec(),
      this.userModel.countDocuments(queryParams).exec(),
    ]);

    return { users, totalCount };
  }

  findOneByRecoveryTokenOrThrow = (recoveryToken: string) =>
    this.userModel
      .findOne({
        recoveryToken: recoveryToken,
        recoveryTokenExpiresAt: { $gt: new Date() },
        deletedAt: null,
      })
      .orFail()
      .exec();

  updatePasswordByIdOrThrow = (userId: string, password: string) =>
    this.userModel
      .findByIdAndUpdate(
        userId,
        {
          password: password,
          recoveryToken: null,
          recoveryTokenExpiresAt: null,
        },
        { new: true }
      )
      .orFail()
      .exec();

  recoverAccountPasswordOrThrow = (email: string, recoveryTokenExpires: Date) =>
    this.userModel
      .findOneAndUpdate(
        { email },
        {
          recoveryToken: randomStringGenerator(),
          recoveryTokenExpiresAt: recoveryTokenExpires,
        },
        { new: true }
      )
      .orFail()
      .exec();

  updateOrThrow = (userId: string, body: UpdateUserDto) =>
    this.userModel
      .findByIdAndUpdate(
        userId,
        {
          firstName: body.firstName,
          lastName: body.lastName,
        },
        { new: true }
      )
      .orFail()
      .exec();

  updateRefreshToken = (
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    rememberMe: boolean
  ) =>
    this.userModel
      .findByIdAndUpdate(
        userId,
        { refreshToken, refreshTokenExpiresAt: expiresAt, rememberMe },
        { new: true }
      )
      .exec();

  findOneByRefreshTokenOrThrow = (refreshToken: string) =>
    this.userModel
      .findOne({
        refreshToken,
        refreshTokenExpiresAt: { $gt: new Date() },
        deletedAt: null,
      })
      .orFail()
      .exec();

  clearRefreshToken = (userId: string) =>
    this.userModel
      .findByIdAndUpdate(
        userId,
        { refreshToken: null, refreshTokenExpiresAt: null },
        { new: true }
      )
      .exec();

  delete = (userId: string) => this.userModel.findByIdAndDelete(userId).exec();
}
