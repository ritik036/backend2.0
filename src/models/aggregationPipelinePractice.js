const aggregationPipeline = [
    {
        $lookup: {
            from: "authors",
            localField: "author_id",
            foreignField: "_id",
            as: "author_details",
        },
    },
    {
        $addFields: {
            authorDetails: {
                $first: "$author_details",
            },
        },
    },
];
