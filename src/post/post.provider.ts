/**
 * 查询片断
 */
export const sqlFragment = {
    user: `
    JSON_OBJECT (
      "id", user.id,
      "name", user.name,
      "avatar", IF(COUNT(avatar.id), 1, null)
    ) AS user
  `,
    leftJoinUser: `
    LEFT JOIN user
      ON user.id = post.userId
    LEFT JOIN avatar
      ON user.id = avatar.userId
  `,
    category: `
    (
        SELECT
          category.name
        FROM
          category
        WHERE category.id = post.categoryId
      ) AS category
    `,
    // leftJoinCategory: `
    //  LEFT JOIN category
    //    ON category.id = post.categoryId
    // `,
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
    LEFT JOIN LATERAL(
        SELECT *
        FROM 
            cover
        WHERE cover.postId = post.id
        ORDER BY cover.id DESC
        LIMIT 1
    ) AS cover ON post.id = cover.postId
    `,
    totalComments: `
    (
        SELECT
        COUNT(comment.id)
      FROM
        comment
      WHERE
        comment.postId = post.id
    ) AS totalComments
        `,
    leftJoinOneFile: `
    LEFT JOIN LATERAL(
    SELECT *
    FROM file
      WHERE file.postId = post.id
      ORDER BY file.id DESC
      LIMIT 1
    ) AS file ON post.id = file.postId
        `,
    file: `
    CAST(
        IF(
        COUNT(file.id),
        GROUP_CONCAT(
            DISTINCT JSON_OBJECT(
                "id", file.id,
                "filename", file.originalname,
                "mimetype", file.mimetype,
                "size", file.size
            )
        ),
            NULL
        ) AS JSON
    ) AS file
        `,
    leftJoinTag: `
    LEFT JOIN
    post_tag ON post_tag.postId = post.id
    LEFT JOIN
    tag ON post_tag.tagId = tag.id
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
    SELECT 
        COUNT(user_like_post.postId)
      FROM user_like_post
      WHERE user_like_post.postId = post.id
    ) AS totalLikes
        `,
    innerJoinUserLikePost: `
    INNER JOIN user_like_post
    ON user_like_post.postId = post.id
    `,
};
