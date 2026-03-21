import { Router } from "express";
import httpErrors from "http-errors";
import { UniqueConstraintError, ValidationError } from "sequelize";

import { User } from "@web-speed-hackathon-2026/server/src/models";
import { AUTH_ERROR_CODES, validateSignupPayload } from "@web-speed-hackathon-2026/server/src/routes/api/auth_validation";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const validationCode = validateSignupPayload(req.body);
  if (validationCode !== null) {
    return res.status(400).type("application/json").send({ code: validationCode });
  }

  try {
    const { id: userId } = await User.create(req.body);
    const user = await User.findByPk(userId);

    req.session.userId = userId;
    return res.status(200).type("application/json").send(user);
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      return res.status(400).type("application/json").send({ code: AUTH_ERROR_CODES.usernameTaken });
    }
    if (err instanceof ValidationError) {
      return res.status(400).type("application/json").send({ code: AUTH_ERROR_CODES.invalidUsername });
    }
    throw err;
  }
});

authRouter.post("/signin", async (req, res) => {
  const user = await User.findOne({
    where: {
      username: req.body.username,
    },
  });

  if (user === null) {
    throw new httpErrors.BadRequest();
  }
  if (!user.validPassword(req.body.password)) {
    throw new httpErrors.BadRequest();
  }

  req.session.userId = user.id;
  return res.status(200).type("application/json").send(user);
});

authRouter.post("/signout", async (req, res) => {
  req.session.userId = undefined;
  return res.status(200).type("application/json").send({});
});
