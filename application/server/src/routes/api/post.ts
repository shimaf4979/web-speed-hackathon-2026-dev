import { Router } from "express";
import httpErrors from "http-errors";

import { Comment, Post } from "@web-speed-hackathon-2026/server/src/models";
import { clearHtmlCache } from "@web-speed-hackathon-2026/server/src/routes/static";

export const postRouter = Router();

postRouter.get("/posts", async (req, res) => {
  const limit = req.query["limit"] != null ? Number(req.query["limit"]) : undefined;
  const offset = req.query["offset"] != null ? Number(req.query["offset"]) : undefined;

  try {
    const posts = await Post.findAll({
      limit,
      offset,
    });

    if (!Array.isArray(posts)) {
      console.error("[debug][GET /api/v1/posts] Post.findAll returned non-array result", {
        limit,
        offset,
        resultType: typeof posts,
      });
    }

    return res.status(200).type("application/json").send(posts);
  } catch (error) {
    console.error("[debug][GET /api/v1/posts] failed", {
      limit,
      offset,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
});

postRouter.get("/posts/:postId", async (req, res) => {
  const post = await Post.findByPk(req.params.postId);

  if (post === null) {
    throw new httpErrors.NotFound();
  }

  return res.status(200).type("application/json").send(post);
});

postRouter.get("/posts/:postId/comments", async (req, res) => {
  const posts = await Comment.findAll({
    limit: req.query["limit"] != null ? Number(req.query["limit"]) : undefined,
    offset: req.query["offset"] != null ? Number(req.query["offset"]) : undefined,
    where: {
      postId: req.params.postId,
    },
  });

  return res.status(200).type("application/json").send(posts);
});

postRouter.post("/posts", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const post = await Post.create(
    {
      ...req.body,
      userId: req.session.userId,
    },
    {
      include: [
        {
          association: "images",
          through: { attributes: [] },
        },
        { association: "movie" },
        { association: "sound" },
      ],
    },
  );

  const createdPost = await Post.findByPk(post.id);
  if (createdPost === null) {
    throw new httpErrors.InternalServerError("Created post could not be reloaded");
  }

  clearHtmlCache();
  return res.status(200).type("application/json").send(createdPost);
});
