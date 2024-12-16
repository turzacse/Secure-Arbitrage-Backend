const User = require("../models/arbitrageWalletloginModel");
const jwt = require("jsonwebtoken");




exports.findOrCreateUser = async (req, res) => {
    try {
        const user = await User.findOne({ walletAddress: req.body.walletAddress });
        if (user) {
            // make jwt token
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
                expiresIn: "1d",
            });

            return res.status(200).json({
                token,
                user,
            })
        }
        else {
            const newUser = new User({
                walletAddress: req.body.walletAddress,
            });
            const data = await newUser.save();

            // make jwt token
            const token = jwt.sign({ id: data._id }, process.env.JWT_SECRET, {
                expiresIn: "1d",
            });

            res.status(200).json({
                token,
                user: data,
            })
        }
    }
    catch (e) {
        console.error(e.message);
        res.status(500).json({ message: "An error occurred while creating user" });
    }
}

exports.getUser = async (req, res) => {
    try {
        if (req.user) {
            res.json(req.user);
        }
        else {
            res.status(404).json({ message: "User not found" });
        }
    }
    catch (e) {
        console.error(e.message);
        res.status(500).json({ message: "An error occurred while getting user by wallet address" });
    }
}

exports.getAllUser = async (req, res) => {
    try {
        const userdata = await User.find({}).sort({ createdAt: -1 });
        res.json(userdata);
    }
    catch (e) {
        console.error(e.message);
        res.status(500).json("An error occurred while getting all data");
    }
}

exports.updateUserProfile = async (req, res) => {
    try {
        const data = {
            email: req.body.email,
            subscriptionStart: req.body.subscriptionStart,
            subscriptionEnd: req.body.subscriptionEnd,
            botStart: req.body.botStart,
            botEnd: req.body.botEnd,
        };

        const options = { upsert: true, new: true };

        const user = await User.findByIdAndUpdate(req.params.id, data, options);

        res.status(200).json({
            user: {
                email: user.email,
            },
            message: "Profile has been updated",
        });
    }
    catch (e) {
        console.error(e.message);
        res.status(500).json("An error occurred while updating profile!");
    }
}
exports.updateUserToken = async (req, res) => {
    try {
        const user = await User.findOne({ walletAddress: req.params.id });
        console.log(user)
        let data = {};
        let data1 = {};
        if (req.body.dslWon) {
            data = {
                dslWon: req.body.dslWon + user?.dslWon
            }
            data1 = {
                'thisMonth.dslWon': req.body.dslWon + user?.thisMonth?.dslWon
            }
        }
        else if (req.body.busdWon) {
            data = {
                busdWon: req.body.busdWon + user?.busdWon
            }
            data1 = {
                'thisMonth.busdWon': req.body.busdWon + user?.thisMonth?.busdWon
            }
        }
        if (user) {
            const date = new Date().getMonth();
            console.log(date, "compare", user?.thisMonth?.month, new Date())
            if (date + 1 == user?.thisMonth?.month) {
                const updated1 = await user.updateOne({
                    $set: data1
                })

            }
            else {
                const updated2 = await user.updateOne({
                    $set: {
                        'prevMonth.month': user?.thisMonth?.month - 1
                    }
                })
                if ((req.body.busdWon || req.body.dslWon)) {
                    const updated3 = await user.updateOne({
                        $set: {
                            'prevMonth.busdWon': user?.thisMonth?.busdWon
                        }
                    })
                    const updated4 = await user.updateOne({
                        $set: {
                            'prevMonth.dslWon': user?.thisMonth?.dslWon
                        }
                    })
                }
                if (req.body.dslWon) {
                    const updated1 = await user.updateOne({
                        $set: {
                            'thisMonth.dslWon': req.body.dslWon
                        }
                    })

                }
                else if (req.body.busdWon) {
                    const updated1 = await user.updateOne({
                        $set: {
                            'thisMonth.busdWon': req.body.busdWon
                        }
                    })

                }


            }

        }

        if (user) {
            const updated = await user.updateOne({
                $set: data
            })

        }

        res.status(200).json({
            message: "Token has been updated",
        });
    }
    catch (e) {
        console.error(e.message);
        res.status(500).json("An error occurred while updating profile!");
    }
}

exports.deleteDataById = async (req, res) => {

    const data = await User.findById(req.params.id);
    const result = await data.remove();
    return res.status(200).json({
        message: "Deleted!!",
        result: result
    });

}