import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { LeanWithMongoId } from 'src/_utils/types';
import { CreateSshKeyData } from './_utils/types/ssh-key.types';
import { SshKey, SshKeyDocument } from './schemas/ssh-key.schema';

export type SshKeyLean = LeanWithMongoId<SshKey>;

const DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class SshKeysRepository {
  SSH_KEY_ALREADY_EXISTS = 'SSH_KEY_ALREADY_EXISTS';

  constructor(@InjectModel(SshKey.name) private sshKeyModel: Model<SshKey>) {}

  create = (data: CreateSshKeyData): Promise<SshKeyDocument> =>
    this.sshKeyModel.create(data).catch((err: { code?: number }) => {
      if (err.code === DUPLICATE_KEY_ERROR) {
        throw new ConflictException(this.SSH_KEY_ALREADY_EXISTS);
      }
      throw err;
    });

  findByUser = (userId: string): Promise<SshKeyLean[]> =>
    this.sshKeyModel.find({ userId }).sort({ createdAt: -1 }).lean().exec();

  findByFingerprint = (fingerprint: string): Promise<SshKeyLean | null> =>
    this.sshKeyModel.findOne({ fingerprint }).lean().exec();

  deleteForUser = async (userId: string, id: string): Promise<boolean> => {
    if (!isValidObjectId(id)) return false;
    const { deletedCount } = await this.sshKeyModel
      .deleteOne({ _id: id, userId })
      .exec();
    return deletedCount > 0;
  };
}
