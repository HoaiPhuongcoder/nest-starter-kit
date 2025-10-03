import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class HashingService {
  async hash(plainText: string) {
    return await argon2.hash(plainText, {
      type: argon2.argon2id,
    });
  }

  async compare(plainText: string, hashText: string) {
    return argon2.verify(hashText, plainText);
  }
}
