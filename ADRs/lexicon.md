# ADR: Lexicon

The lexicon ultimately was written to be simple and minimal, storing a board as a blob with its width and height. 

## Finalizing Project Idea

The lexicon design went through several iterations as the project idea changed. Initially, we thought we would have to support "contributions"; i.e store pixels a user added to a shared board. But we ended up doing away with the concept of shared boards and reducing the scope of our project as a de-risking mechanism, so the scope of the lexicon was also reduced. The lexicon now only needs to store each user's boards in some fashion, and we chose to do this as a blob.

## Why Blobs?

The key design choice was whether to store the board as a blob or as an array/matrix of colors. Storing the board as an array/matrix would allow easier manipulation of the pixels within the app without having to compress/decompress the image. Storing the board as a blob would reduce space used in the user's PDS and would make interopability (e.g attaching the board to a bluesky post) much more straightforward. We decided to go with blobs since converting to/from png for small images is fairly low overhead, and because it's a cleaner, more generalizable solution that allows for other types of data to be stored in future, and permits easy bluesky integration.

## File Size Limits

We were initially concerned about PDS file size restrictions, but ultimately concluded that they have minimal effect on our app and on lexicon design. There's a 50 MB limit on blob uploads to a Bluesky PDS, which is massive and far above our needs. More relevantly, there's a limit of 2 MB on images attached to posts. A 2 MB limit would dictate a max square image size of around 700 x 700 pixels (uncompressed, 4 bytes per pixel). We found this is more than enough for a pixel art board; pixel art is generally done at 256 x 256 or less resolution, and at higher resolutions it begins to resemble painting. We set a limit of 512 x 512 on our boards, well under the 2 MB limit and at the high end of what would realistically be considered pixel art. These limits have no bearing on whether we store the image as a blob or array; the blob representation is compressed and usually reduces image size, but in the worst case (which is important, since the app needs to be reliable), it's the same size as an uncompressed array. 