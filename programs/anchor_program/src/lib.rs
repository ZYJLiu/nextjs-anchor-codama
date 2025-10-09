#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

declare_id!("SApGwJ3zpvucuQbV1kXdrbeuiBunZ6q48o6xucrSGYR");

#[program]
pub mod anchor_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
