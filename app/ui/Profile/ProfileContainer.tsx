"use client";
import { disable2FA, enable2FA, verify2FA } from "@/app/lib/api";
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import Image from "next/image";
import React, { useState } from "react";
import Header from "../Header/Header";
import { useSession } from "next-auth/react";
import ConfirmationDialog from "../CustomComponent/ConfirmationDialog";
import AlertSnackbar from "../CustomComponent/AlertSnackbar";

const ProfileContainer = () => {
  const session = useSession();
  const [qrcodeImage, setQrcodeImage] = useState<string>("");
  const [twoFactorCode, setTwoFactorCode] = useState<string>("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [disable2FaModal, setDisable2FaModal] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [verifyError, setVerifyError] = useState<string>("");
  const user: any = session.data?.user;
  React.useEffect(() => {
    if (user) {
      setTwoFactorEnabled(!!user.twoFactorEnabled);
    }
  }, [user]);
  const onEnable2FA = () => {
    if (!twoFactorEnabled) {
      enable2FA()
        .then((data) => {
          setQrcodeImage(data?.qrCodeDataURL || "");
        })
        .catch((error) => {
          console.error(error);
        });
    }
  };
  const onVerify2FA = () => {
    if (!twoFactorEnabled) {
      verify2FA(twoFactorCode)
        .then((data) => {
          setTwoFactorEnabled(true);
          setQrcodeImage("");
          setSnackbarMessage("2FA enabled");
        })
        .catch((error) => {
          setVerifyError(error?.message || "Error enabling 2FA");
          console.error(error);
        });
    }
  };
  const onDisable2FA = () => {
    disable2FA()
      .then((data) => {
        setSnackbarMessage("2FA disabled");
        setTwoFactorEnabled(false);
      })
      .catch((error) => {
        console.error(error);
      });
  };
  return (
    <>
      <AlertSnackbar
        open={snackbarMessage.length > 0}
        onClose={() => setSnackbarMessage("")}
        text={snackbarMessage}
        severity="success"
      />
      <ConfirmationDialog
        title="Disable 2FA"
        description="Are you sure you want to disable 2FA?"
        open={disable2FaModal}
        primaryActionText="Yes"
        secondaryActionText="No"
        onClose={() => {
          setDisable2FaModal(false);
        }}
        onConfirm={onDisable2FA}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100vw",
          height: "100vh",
          gap: "10px",
        }}
      >
        <Box
          sx={{
            flex: 1,
            padding: "8px",
            maxHeight: "7vh",
            background: "#13082a",
            color: "white",
          }}
        >
          <Header />
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Paper
            sx={{
              width: "900px",
              padding: "24px",
              minHeight: "50vh",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
            elevation={4}
          >
            <Typography variant="h6">Profile</Typography>
            <TextField
              value={user?.email || " "}
              variant="filled"
              fullWidth
              label="Email"
              disabled
            />
            {qrcodeImage?.length === 0 && !twoFactorEnabled && (
              <Button variant="contained" color="primary" onClick={onEnable2FA}>
                Enable 2FA
              </Button>
            )}
            {twoFactorEnabled && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setDisable2FaModal(true);
                }}
              >
                Disable 2FA
              </Button>
            )}
            {qrcodeImage?.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                <Typography variant="h6">
                  Scan de qr-code met behulp van de Microsoft
                  Authenticator-applicatie
                </Typography>
                <Image
                  src={qrcodeImage}
                  alt="QR Code"
                  width={300}
                  height={300}
                />
              </Box>
            )}
            {qrcodeImage?.length > 0 && (
              <>
                <Typography variant="h6">
                  Voer hieronder de verificatiecode uit de Microsoft
                  Authenticator-applicatie in.
                </Typography>
                <TextField
                  label="2FA Code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  error={verifyError.length > 0}
                  helperText={verifyError}
                />
                <Button
                  disabled={twoFactorCode.length === 0}
                  variant="contained"
                  color="primary"
                  onClick={onVerify2FA}
                >
                  Verify 2FA
                </Button>
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </>
  );
};

export default ProfileContainer;
