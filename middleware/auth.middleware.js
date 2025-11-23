const jwt = require("jsonwebtoken");

const jwtScretKey = process.env.JWT_SCRET_KEY || 'jwt_scret_key'


const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).send({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, jwtScretKey);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(403).send({ message: "Invalid or expired token" });
    }
};

module.exports = { authMiddleware };
