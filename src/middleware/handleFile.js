import multer from "multer";

export const handleFile = (req, res, next) => {
	const upload = multer({
		dest: "./public/data/uploads/",
		fileFilter: (req, file, cb) => {
			console.log(file);
			// const validFiles = ["image/jpeg", "image/png", "application/pdf"];
			const validFiles = ["image/jpeg","image/jpg", "image/png", "application/pdf", "text/plain", "video/mp4", "audio/mpeg"]
			if (validFiles.includes(file.mimetype)) return cb(null, true);

			return cb(new Error("File should be jpeg, png, mp4, mpeg, or pdf"));
		},
		limits: { fileSize: 6 * 1000 * 1000 },
	}).single("uploaded_file");

	upload(req, res, (err) => {
		if (err instanceof multer.MulterError) {
			// A Multer error occurred when uploading.
			console.log(err.message);
		} else if (err) {
			// An unknown error occurred when uploading.
			return res.status(200).json({ message: "Please make sure the file is in JPEG, PNG, or PDF format" });
		}

		// Everything went fine.
		next();
	});
};
