import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSshKeyDto } from './_utils/dto/requests/create-ssh-key.dto';
import { GetSshKeyDto } from './_utils/dto/responses/get-ssh-key.dto';
import { parseSshPublicKey } from './_utils/functions/parse-ssh-public-key.function';
import { DeployAgentMapper } from './deploy-agent.mapper';
import { SshKeysRepository } from './ssh-keys.repository';

@Injectable()
export class SshKeysService {
  constructor(
    private readonly sshKeysRepository: SshKeysRepository,
    private readonly deployAgentMapper: DeployAgentMapper,
  ) {}

  list = async (userId: string): Promise<GetSshKeyDto[]> =>
    (await this.sshKeysRepository.findByUser(userId)).map(
      this.deployAgentMapper.toSshKeyDto,
    );

  add = async (userId: string, dto: CreateSshKeyDto): Promise<GetSshKeyDto> => {
    const key = parseSshPublicKey(dto.publicKey);
    if (!key) throw new BadRequestException('INVALID_SSH_KEY');

    const doc = await this.sshKeysRepository.create({
      userId,
      title: dto.title ?? key.comment ?? key.fingerprint,
      publicKey: key.publicKey,
      fingerprint: key.fingerprint,
    });
    return this.deployAgentMapper.toSshKeyDto(doc);
  };

  remove = async (userId: string, id: string): Promise<void> => {
    const deleted = await this.sshKeysRepository.deleteForUser(userId, id);
    if (!deleted) throw new NotFoundException('SSH_KEY_NOT_FOUND');
  };

  findOwner = async (publicKey: string): Promise<string | undefined> => {
    const key = parseSshPublicKey(publicKey);
    if (!key) return undefined;
    const doc = await this.sshKeysRepository.findByFingerprint(key.fingerprint);
    return doc?.userId;
  };
}
