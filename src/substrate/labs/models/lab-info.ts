export class LabInfo {
  constructor(
    info: any
  ) {
    this.box_public_key = info.boxPublicKey;
    this.name           = info.name;
    this.email          = info.email;
    this.phone_number   = info.phoneNumber;
    this.website        = info.website;
    this.country        = info.country;
    this.region         = info.region;
    this.city           = info.city;
    this.address        = info.address;
    this.latitude       = info.latitude;
    this.longitude      = info.longitude;
    this.profile_image  = info.profileImage;
  }

  box_public_key: String;
  name: string;
  email: string;
  phone_number: string;
  website: string;
  country: string;
  region: string;
  city: string;
  address: string;
  latitude?: string;
  longitude?: string;
  profile_image?: string;
}
