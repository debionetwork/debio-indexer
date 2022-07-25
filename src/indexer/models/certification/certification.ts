import { Info } from './info';

export class Certification {
  constructor(certification: any) {
    this.id = certification.id;
    this.owner_id = certification.ownerId;
    this.info = new Info(certification.info);
  }
  id: string;
  owner_id: string;
  info: Info;
}
