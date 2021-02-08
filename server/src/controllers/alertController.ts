import {
  Brackets,
  getConnection,
  IsNull,
  MoreThanOrEqual,
  Not,
  Timestamp,
} from "typeorm";
import { Alert, UserRoles } from "../entities";
export interface IAlertController {
  getAll: (role: UserRoles, body: any) => Promise<[Alert[], number] | void>;
  submit: (body: any) => Promise<void>;
}

interface IExpectedAlert {
  timestamp: Timestamp;
  hostname: string;
  application_id: string;
  file: string;
  change_agent: string;
  change_process: string;
}

const IAlertController: IAlertController = {
  getAll: async (role: UserRoles, body: any) => {
    const { extended = false, skip = 0, filter = 2, perPage = 100 } = body;
    const date = new Date();
    date.setDate(date.getDate() - 2);

    let alerts: [Alert[], number] | void;

    const alertRepository = getConnection().getRepository(Alert);
    alerts = await alertRepository
      .createQueryBuilder("alert")
      .leftJoinAndSelect("alert.user", "user")
      .orderBy("alert.timestamp", "DESC")
      .where({
        timestamp:
          role === UserRoles.ADMIN && extended
            ? Not(IsNull())
            : MoreThanOrEqual(date.toISOString()),
      })
      .andWhere(
        new Brackets((qb) => {
          if (filter === 2) {
            return qb.where({ currentState: Not(2) });
          }
          return qb.where({ currentState: filter });
        })
      )
      .skip(skip)
      .take(perPage)
      .getManyAndCount()
      .catch((err) => {
        console.error(err);
      });
    return alerts;
  },
  submit: async (body: any) => {
    //  Ignoring Validation for right now...
    let {
      application_id,
      timestamp,
      change_agent,
      change_process,
      file,
      hostname,
    }: IExpectedAlert = body;
    const alert = Alert.create({
      change_agent,
      change_process,
      file,
      hostname,
      timestamp,
    });

    await alert.save();
  },
};

export default IAlertController;
