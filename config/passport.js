import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userSchema.js';
import dotenv from 'dotenv';
dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/auth/google/callback',
            proxy: true
        },
        async (accessToken, refreshToken, profile, done) => {
            try {

                if (!profile.id || !profile.emails?.[0]?.value) {
                    return done(new Error('Google profile missing required fields'), null);
                }

                const email = profile.emails[0].value;
                const googleId = profile.id;
                const displayName = profile.displayName || 'Anonymous';

                let user = await User.findOne({ email });

                if (user) {

                    if (user.isBlocked) {
                        console.log('Blocked user attempted login:', email);
                        return done(null, false, {
                            message: 'Your account has been blocked. Please contact support.'
                        });
                    }

                    if (!user.googleId) {
                        user.googleId = googleId;
                        await user.save();
                        console.log('Linked Google ID to existing user:', user);
                    }
                    return done(null, user);
                }

                // Create new user
                user = new User({
                    name: displayName,
                    email: email,
                    googleId: googleId,
                    isVerified: true,
                    isBlocked: false,
                });

                await user.save();
                console.log('Created new Google user:', user);
                return done(null, user);

            } catch (error) {
                console.error('Google auth error:', error);
                return done(error, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    console.log('Serializing user:', user._id);
    done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        if (!user) {
            console.log('User not found for ID:', id);
            return done(null, false);
        }
        if (user.isBlocked) {
            console.log('Blocked user detected during deserialize:', user.email);
            return done(null, false, {
                message: 'Your account has been blocked. Please contact support.'
            });
        }
        return done(null, user);
    } catch (error) {
        console.error('Deserialize error:', error);
        return done(error, null);
    }
});

export default passport;