export interface PdUser {
  name: string;
  email: string;
  id: string;
}

export interface PdSchedule {
  id: string;
}

export interface PdOncallResult {
  user: PdUser;
  schedule: PdSchedule;
}
