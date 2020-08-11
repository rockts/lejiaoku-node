/**
 * 查询片断
 */
export const sqlFragment = {
  cover: `
    CAST(
      IF(
        COUNT(cover.id),
        GROUP_CONCAT(
          DISTINCT JSON_OBJECT(
            'id', cover.id,
            'width', cover.width,
            'height', cover.height
          )
        ),
        NULL
      ) AS JSON
    ) AS cover
  `,
  leftJoinOneCover: `
    LEFT JOIN LATERAL (
      SELECT *
      FROM cover
      WHERE cover.resourcesId = resources.id
      ORDER BY cover.id DESC
      LIMIT 1
    ) AS cover ON resourcesid = cover.resourcesId
  `,
  user: `
    JSON_OBJECT (
      "id", user.id,
      "name", user.name,
      "avatar", IF(COUNT(avatar.id), 1, null)
    ) As user,
  `,
  leftJoinUser: `
    LEFT JOIN user
      ON user.id = resources.userId
    LEFT JOIN avatar
      ON user.id = avatar.userId
  `,
  totalComments: `
    (
      SELECT
        COUNT(comment.id)
      FROM
        comment
      WHERE
        comment.resourcesId = resources.id
    ) as totalComments
  `,
  leftJoinOneFile: `
    LEFT JOIN LATERAL (
      SELECT *
      FROM file
      WHERE file.resourcesId = resources.id
      ORDER BY file.id DESC
      LIMIT 1
    ) AS file ON resourcesid = file.resourcesId
  `,
  file: `
    CAST(
      IF(
        COUNT(file.id),
        GROUP_CONCAT(
          DISTINCT JSON_OBJECT(
            'id', file.id,
            'width', file.width,
            'height', file.height
          )
        ),
        NULL
      ) AS JSON
    ) AS file
  `,
  leftJoinTag: `
    LEFT JOIN
    resources_tag ON resources_tag.resourcesId = resources.id
    LEFT JOIN
      tag ON resources_tag.tagId = tag.id
  `,
  tags: `
    CAST(
      IF(
        COUNT(tag.id),
        CONCAT(
          '[',
            GROUP_CONCAT(
              DISTINCT JSON_OBJECT(
                'id', tag.id,
                'name', tag.name
              )
            ),
          ']'
        ),
        NULL
      ) AS JSON
    ) AS tags
  `,
  totalLikes: `
    (
      SELECT COUNT(user_like_resources.resourcesId)
      FROM user_like_resources
      WHERE user_like_resources.resourcesId = resources.id
    ) AS totalLikes
  `,
  innerJoinUserLikeResources: `
    INNER JOIN user_like_resources
      ON user_like_resources.resourcesId = resources.id
  `,
};
